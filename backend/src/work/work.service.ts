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

  async getReleases(teamId?: string, statusFilter?: string) {
    // Get releases from the Release model
    const where: any = {};
    if (statusFilter) {
      const statuses = statusFilter.split(',').filter(Boolean);
      if (statuses.length > 0) where.status = { in: statuses };
    } else {
      where.status = 'unreleased'; // default: show unreleased
    }

    const releases = await this.prisma.release.findMany({
      where,
      orderBy: [{ releaseDate: 'desc' }, { startDate: 'desc' }, { name: 'desc' }],
    });

    // For each release, compute progress from work items with matching fixVersion
    const teamFilter: any = teamId ? { teamId } : {};

    const results = await Promise.all(releases.map(async (release) => {
      const items = await this.prisma.workItem.findMany({
        where: { fixVersion: release.name, ...teamFilter },
        select: { status: true, storyPoints: true },
      });

      const total = items.length;
      const done = items.filter(i => i.status === 'done').length;
      const inProgress = items.filter(i => i.status === 'in_progress' || i.status === 'in_review').length;
      const todo = total - done - inProgress;
      const sp = items.reduce((sum, i) => sum + (i.storyPoints || 0), 0);

      return {
        id: release.id,
        version: release.name,
        status: release.status,
        startDate: release.startDate,
        releaseDate: release.releaseDate,
        description: release.description,
        totalItems: total,
        doneItems: done,
        inProgressItems: inProgress,
        todoItems: todo,
        progress: total > 0 ? Math.round((done / total) * 100) : 0,
        storyPoints: sp,
      };
    }));

    return results;
  }

  async getReleaseDetails(releaseId: string, teamId?: string) {
    const release = await this.prisma.release.findUnique({ where: { id: releaseId } });
    if (!release) throw new NotFoundException('Release not found');

    const where: any = { fixVersion: release.name };
    if (teamId) where.teamId = teamId;

    const items = await this.prisma.workItem.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        externalId: true,
        title: true,
        status: true,
        priority: true,
        assignee: true,
        storyPoints: true,
        type: true,
        sprint: true,
        externalUrl: true,
      },
    });

    return {
      ...release,
      items,
    };
  }
}
