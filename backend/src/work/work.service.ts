import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkItemDto, UpdateWorkItemDto } from './dto/create-work-item.dto';

@Injectable()
export class WorkService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters?: {
    teamId?: string;
    status?: string;
    source?: string;
    initiativeId?: string;
    startDate?: string;
    endDate?: string;
    sprints?: string[];
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};
    if (filters?.teamId) where.teamId = filters.teamId;
    if (filters?.status) where.status = filters.status;
    if (filters?.source) where.source = filters.source;
    if (filters?.initiativeId) where.initiativeId = filters.initiativeId;

    if (filters?.sprints && filters.sprints.length > 0) {
      where.sprint = { in: filters.sprints };
    } else if (filters?.startDate || filters?.endDate) {
      where.updatedAt = {};
      if (filters.startDate) where.updatedAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.updatedAt.lte = new Date(filters.endDate);
    }

    const take = filters?.limit || 100;
    const skip = filters?.offset || 0;

    return this.prisma.workItem.findMany({
      where,
      include: {
        team: { select: { id: true, name: true, color: true } },
        initiative: { select: { id: true, title: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take,
      skip,
    });
  }

  async findById(id: string) {
    const item = await this.prisma.workItem.findUnique({
      where: { id },
      include: {
        team: { select: { id: true, name: true, color: true } },
        initiative: { select: { id: true, title: true } },
      },
    });
    if (!item) throw new NotFoundException('Work item not found');
    return item;
  }

  async create(dto: CreateWorkItemDto) {
    return this.prisma.workItem.create({
      data: {
        title: dto.title,
        description: dto.description,
        source: dto.source || 'manual',
        status: dto.status || 'todo',
        priority: dto.priority,
        storyPoints: dto.storyPoints,
        assignee: dto.assignee,
        teamId: dto.teamId,
        initiativeId: dto.initiativeId,
        externalId: dto.externalId,
      },
      include: {
        team: { select: { id: true, name: true, color: true } },
        initiative: { select: { id: true, title: true } },
      },
    });
  }

  async update(id: string, data: UpdateWorkItemDto) {
    const item = await this.prisma.workItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Work item not found');
    return this.prisma.workItem.update({
      where: { id },
      data,
      include: {
        team: { select: { id: true, name: true, color: true } },
        initiative: { select: { id: true, title: true } },
      },
    });
  }

  async delete(id: string) {
    const item = await this.prisma.workItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Work item not found');
    await this.prisma.workItem.delete({ where: { id } });
    return { deleted: true };
  }

  async getWorkSummary() {
    const [todo, in_progress, in_review, done, total] = await Promise.all([
      this.prisma.workItem.count({ where: { status: 'todo' } }),
      this.prisma.workItem.count({ where: { status: 'in_progress' } }),
      this.prisma.workItem.count({ where: { status: 'in_review' } }),
      this.prisma.workItem.count({ where: { status: 'done' } }),
      this.prisma.workItem.count(),
    ]);
    return { todo, in_progress, in_review, done, total };
  }

  async getReleases(teamId?: string) {
    const where: any = { fixVersion: { not: null } };
    if (teamId) where.teamId = teamId;

    const items = await this.prisma.workItem.findMany({
      where,
      select: { fixVersion: true, status: true, storyPoints: true },
    });

    // Group by fixVersion
    const versionMap = new Map<string, { total: number; done: number; inProgress: number; todo: number; sp: number }>();
    for (const item of items) {
      const v = item.fixVersion!;
      if (!versionMap.has(v)) {
        versionMap.set(v, { total: 0, done: 0, inProgress: 0, todo: 0, sp: 0 });
      }
      const entry = versionMap.get(v)!;
      entry.total++;
      entry.sp += item.storyPoints || 0;
      if (item.status === 'done') entry.done++;
      else if (item.status === 'in_progress' || item.status === 'in_review') entry.inProgress++;
      else entry.todo++;
    }

    return Array.from(versionMap.entries())
      .map(([version, data]) => ({
        version,
        totalItems: data.total,
        doneItems: data.done,
        inProgressItems: data.inProgress,
        todoItems: data.todo,
        progress: data.total > 0 ? Math.round((data.done / data.total) * 100) : 0,
        storyPoints: data.sp,
      }))
      .sort((a, b) => b.totalItems - a.totalItems);
  }
}
