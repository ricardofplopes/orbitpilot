import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getDashboardData(teamId?: string, startDate?: string, endDate?: string, sprints?: string[]) {
    const teamFilter: any = teamId ? { teamId } : {};

    // Build date/sprint filter
    const dateFilter: any = {};
    if (sprints && sprints.length > 0) {
      dateFilter.sprint = { in: sprints };
    } else if (startDate || endDate) {
      dateFilter.updatedAt = {};
      if (startDate) dateFilter.updatedAt.gte = new Date(startDate);
      if (endDate) dateFilter.updatedAt.lte = new Date(endDate);
    }

    const where = { ...teamFilter, ...dateFilter };

    const [
      workByStatusRaw,
      totalActive,
      totalAtRisk,
      totalDone,
      avgCycleTimeResult,
      sprintData,
      memberWorkload,
      insights,
    ] = await Promise.all([
      this.prisma.workItem.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      this.prisma.workItem.count({
        where: { ...where, status: { notIn: ['done', 'cancelled'] } },
      }),
      this.prisma.workItem.count({
        where: { ...where, priority: { in: ['P1', 'critical'] }, status: { not: 'done' } },
      }),
      this.prisma.workItem.count({
        where: { ...where, status: 'done' },
      }),
      this.prisma.workItem.aggregate({
        where: { ...where, status: 'done', cycleTime: { not: null } },
        _avg: { cycleTime: true },
      }),
      this.prisma.workItem.groupBy({
        by: ['sprint'],
        where: { ...where, sprint: { not: null } },
        _sum: { storyPoints: true },
        _count: true,
      }),
      this.prisma.workItem.groupBy({
        by: ['assignee'],
        where: { ...where, assignee: { not: '' }, status: { notIn: ['done', 'cancelled'] } },
        _count: true,
        _sum: { storyPoints: true },
      }),
      this.prisma.insight.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
    ]);

    const statusMap: Record<string, number> = {};
    for (const r of workByStatusRaw) statusMap[r.status] = r._count;
    const workByStatus = {
      todo: statusMap['todo'] || 0,
      in_progress: statusMap['in_progress'] || statusMap['in-progress'] || 0,
      in_review: statusMap['in_review'] || statusMap['in-review'] || 0,
      done: statusMap['done'] || 0,
      blocked: statusMap['blocked'] || 0,
      backlog: statusMap['backlog'] || 0,
    };

    const velocity = sprintData
      .filter(s => s.sprint)
      .filter(s => /^(BV BO|VBO)\s/i.test(s.sprint!))
      .map(s => ({
        sprint: s.sprint!,
        storyPoints: s._sum.storyPoints || 0,
        itemCount: s._count,
      }))
      .sort((a, b) => b.sprint.localeCompare(a.sprint))
      .slice(0, 20);

    // Filter memberWorkload to only show active team members
    let activeNames: string[] | null = null;
    if (teamId) {
      const activeMembers = await this.prisma.teamMember.findMany({
        where: { teamId, isActive: true },
        include: { user: { select: { name: true } } },
      });
      activeNames = activeMembers.map(m => m.user.name).filter(Boolean);
    }

    const members = memberWorkload
      .filter(m => m.assignee)
      .filter(m => !activeNames || activeNames.some(name =>
        name.toLowerCase() === m.assignee!.toLowerCase()
      ))
      .map(m => ({
        name: m.assignee!,
        activeItems: m._count,
        storyPoints: m._sum.storyPoints || 0,
      }))
      .sort((a, b) => b.activeItems - a.activeItems)
      .slice(0, 20);

    const avgCycleTime = avgCycleTimeResult._avg.cycleTime
      ? Math.round(avgCycleTimeResult._avg.cycleTime * 10) / 10
      : 0;

    const totalSpDelivered = velocity.reduce((sum, s) => sum + s.storyPoints, 0);
    const totalItemsDelivered = velocity.reduce((sum, s) => sum + s.itemCount, 0);

    return {
      committedWork: totalActive,
      atRiskWork: totalAtRisk,
      doneWork: totalDone,
      avgCycleTime,
      totalSpDelivered,
      totalItemsDelivered,
      workByStatus,
      velocity,
      members,
      insights,
    };
  }

  async getAvailableSprints(teamId?: string) {
    const where: any = { sprint: { not: null } };
    if (teamId) where.teamId = teamId;

    const sprintData = await this.prisma.workItem.groupBy({
      by: ['sprint'],
      where,
      _count: true,
    });

    return sprintData
      .filter(s => s.sprint)
      .filter(s => /^(BV BO|VBO)\s/i.test(s.sprint!))
      .map(s => ({ name: s.sprint!, itemCount: s._count }))
      .sort((a, b) => b.name.localeCompare(a.name))
      .slice(0, 30);
  }
}
