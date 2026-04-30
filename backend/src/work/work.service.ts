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
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};
    if (filters?.teamId) where.teamId = filters.teamId;
    if (filters?.status) where.status = filters.status;
    if (filters?.source) where.source = filters.source;
    if (filters?.initiativeId) where.initiativeId = filters.initiativeId;

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
}
