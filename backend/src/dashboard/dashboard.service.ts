import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getDashboardData(teamId?: string) {
    const teamFilter = teamId ? { teamId } : {};

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
        where: teamFilter,
        _count: true,
      }),
      this.prisma.workItem.count({
        where: { ...teamFilter, status: { notIn: ['done', 'cancelled'] } },
      }),
      this.prisma.workItem.count({
        where: { ...teamFilter, priority: { in: ['P1', 'critical'] }, status: { not: 'done' } },
      }),
      this.prisma.workItem.count({
        where: { ...teamFilter, status: 'done' },
      }),
      this.prisma.workItem.aggregate({
        where: { ...teamFilter, status: 'done', cycleTime: { not: null } },
        _avg: { cycleTime: true },
      }),
      // Sprint velocity: group done items by sprint
      this.prisma.workItem.groupBy({
        by: ['sprint'],
        where: { ...teamFilter, sprint: { not: null }, status: 'done' },
        _sum: { storyPoints: true },
        _count: true,
      }),
      // Member workload: group active items by assignee
      this.prisma.workItem.groupBy({
        by: ['assignee'],
        where: { ...teamFilter, assignee: { not: '' }, status: { notIn: ['done', 'cancelled'] } },
        _count: true,
        _sum: { storyPoints: true },
      }),
      this.prisma.insight.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
    ]);

    // Work by status
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

    // Sprint velocity (sorted by sprint name, last 10)
    const velocity = sprintData
      .filter(s => s.sprint)
      .map(s => ({
        sprint: s.sprint!,
        storyPoints: s._sum.storyPoints || 0,
        itemCount: s._count,
      }))
      .sort((a, b) => a.sprint.localeCompare(b.sprint))
      .slice(-10);

    // Member workload (top 20 by active items)
    const members = memberWorkload
      .filter(m => m.assignee)
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

    // Total story points delivered
    const totalSpDelivered = velocity.reduce((sum, s) => sum + s.storyPoints, 0);

    return {
      committedWork: totalActive,
      atRiskWork: totalAtRisk,
      doneWork: totalDone,
      avgCycleTime,
      totalSpDelivered,
      workByStatus,
      velocity,
      members,
      insights,
    };
  }
}
