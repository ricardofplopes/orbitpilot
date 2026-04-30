import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getDashboardData() {
    const [
      teams,
      workByStatusRaw,
      workByTeamRaw,
      totalActive,
      totalAtRisk,
      avgCycleTimeResult,
      insights,
      activePlan,
    ] = await Promise.all([
      this.prisma.team.findMany({
        include: {
          members: { include: { availability: true } },
          workItems: { where: { status: { notIn: ['done', 'cancelled'] } } },
        },
      }),
      this.prisma.workItem.groupBy({
        by: ['status'],
        _count: true,
      }),
      this.prisma.workItem.groupBy({
        by: ['teamId'],
        _count: true,
      }),
      this.prisma.workItem.count({
        where: { status: { notIn: ['done', 'cancelled'] } },
      }),
      this.prisma.workItem.count({
        where: { priority: { in: ['P1', 'critical'] }, status: { not: 'done' } },
      }),
      this.prisma.workItem.aggregate({
        where: { status: 'done', cycleTime: { not: null } },
        _avg: { cycleTime: true },
      }),
      this.prisma.insight.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
      this.prisma.quarterPlan.findFirst({
        where: { status: 'active' },
        include: {
          initiatives: {
            include: { team: { select: { id: true, name: true, color: true } } },
          },
        },
      }),
    ]);

    // Work by status
    const statusMap: Record<string, number> = {};
    for (const r of workByStatusRaw) statusMap[r.status] = r._count;
    const workByStatus = {
      todo: statusMap['todo'] || 0,
      in_progress: statusMap['in_progress'] || statusMap['in-progress'] || 0,
      in_review: statusMap['in_review'] || statusMap['in-review'] || 0,
      done: statusMap['done'] || 0,
    };

    // Work by team (using groupBy results)
    const teamIdMap = new Map(teams.map(t => [t.id, t.name]));
    const workByTeam: { team: string; count: number }[] = [];
    let unassignedCount = 0;
    for (const r of workByTeamRaw) {
      if (r.teamId && teamIdMap.has(r.teamId)) {
        workByTeam.push({ team: teamIdMap.get(r.teamId)!, count: r._count });
      } else {
        unassignedCount += r._count;
      }
    }
    if (unassignedCount > 0) {
      workByTeam.push({ team: 'Unassigned', count: unassignedCount });
    }
    // Sort by count descending
    workByTeam.sort((a, b) => b.count - a.count);

    // Capacity by team (2-week sprint assumption)
    const capacityByTeam = teams.map((t) => {
      const weeklyCapacity = t.members.reduce((sum, m) => sum + m.weeklyCapacity, 0);
      const sprintCapacity = weeklyCapacity * 2;
      const activeItems = t.workItems;
      const committedHours = activeItems.reduce((sum, w) => sum + (w.storyPoints || 0) * 4, 0);
      const utilization = sprintCapacity > 0 ? Math.round((committedHours / sprintCapacity) * 100) : 0;
      const atRiskItems = activeItems.filter((w) => w.priority === 'P1' || w.priority === 'critical');
      const atRiskHours = atRiskItems.reduce((sum, w) => sum + (w.storyPoints || 0) * 4, 0);
      const atRiskPct = sprintCapacity > 0 ? Math.round((atRiskHours / sprintCapacity) * 100) : 0;
      const committedPct = Math.min(utilization - atRiskPct, 100);
      const availablePct = Math.max(100 - utilization, 0);
      const unavailablePct = Math.max(utilization - 100, 0);
      return {
        team: t.name,
        available: availablePct,
        committed: Math.max(committedPct, 0),
        atRisk: atRiskPct,
        unavailable: unavailablePct,
      };
    });

    // Aggregate capacity percent
    const allCapacity = teams.map((t) => {
      const weeklyCapacity = t.members.reduce((sum, m) => sum + m.weeklyCapacity, 0);
      const sprintCapacity = weeklyCapacity * 2;
      const committedHours = t.workItems.reduce((sum, w) => sum + (w.storyPoints || 0) * 4, 0);
      return sprintCapacity > 0 ? Math.round((committedHours / sprintCapacity) * 100) : 0;
    });
    const totalCapacityPercent = allCapacity.length > 0
      ? Math.round(allCapacity.reduce((s, c) => s + c, 0) / allCapacity.length)
      : 0;

    const avgCycleTime = avgCycleTimeResult._avg.cycleTime
      ? Math.round(avgCycleTimeResult._avg.cycleTime * 10) / 10
      : 0;

    // Top priorities (P1 initiatives from active plan)
    const topPriorities = activePlan
      ? activePlan.initiatives
          .filter((i) => i.priority === 'P1')
          .slice(0, 5)
          .map((i) => ({
            id: i.id,
            title: i.title,
            priority: i.priority,
            team: i.team,
            status: i.status,
            estimatedEffort: i.estimatedEffort,
          }))
      : [];

    // Upcoming milestones (from initiatives with deadlines)
    const upcomingMilestones = activePlan
      ? activePlan.initiatives
          .filter((i) => i.status !== 'completed')
          .slice(0, 5)
          .map((i) => ({
            id: i.id,
            title: i.title,
            team: i.team,
            priority: i.priority,
            status: i.status,
          }))
      : [];

    return {
      teamCapacityPercent: totalCapacityPercent,
      committedWork: totalActive,
      atRiskWork: totalAtRisk,
      avgCycleTime,
      workByStatus,
      workByTeam,
      capacityByTeam,
      topPriorities,
      upcomingMilestones,
      insights,
      activePlan: activePlan
        ? { id: activePlan.id, name: activePlan.name, initiativeCount: activePlan.initiatives.length }
        : null,
    };
  }
}
