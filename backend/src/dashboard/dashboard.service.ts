import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getDashboardData() {
    const [
      teams,
      workItems,
      insights,
      activePlan,
    ] = await Promise.all([
      this.prisma.team.findMany({
        include: {
          members: {
            include: {
              availability: true,
            },
          },
          workItems: true,
        },
      }),
      this.prisma.workItem.findMany({
        include: {
          team: { select: { id: true, name: true, color: true } },
        },
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
    const workByStatus = {
      todo: workItems.filter((w) => w.status === 'todo').length,
      in_progress: workItems.filter((w) => w.status === 'in_progress').length,
      in_review: workItems.filter((w) => w.status === 'in_review').length,
      done: workItems.filter((w) => w.status === 'done').length,
    };

    // Work by team
    const workByTeam = teams.map((t) => ({
      team: t.name,
      count: t.workItems.length,
    }));

    // Capacity by team (2-week sprint assumption)
    const capacityByTeam = teams.map((t) => {
      const weeklyCapacity = t.members.reduce((sum, m) => sum + m.weeklyCapacity, 0);
      const sprintCapacity = weeklyCapacity * 2;
      const activeItems = t.workItems.filter((w) => w.status !== 'done' && w.status !== 'cancelled');
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

    // Aggregate metrics
    const allCapacity = teams.map((t) => {
      const weeklyCapacity = t.members.reduce((sum, m) => sum + m.weeklyCapacity, 0);
      const sprintCapacity = weeklyCapacity * 2;
      const committedHours = t.workItems
        .filter((w) => w.status !== 'done' && w.status !== 'cancelled')
        .reduce((sum, w) => sum + (w.storyPoints || 0) * 4, 0);
      return sprintCapacity > 0 ? Math.round((committedHours / sprintCapacity) * 100) : 0;
    });
    const totalCapacityPercent = allCapacity.length > 0
      ? Math.round(allCapacity.reduce((s, c) => s + c, 0) / allCapacity.length)
      : 0;

    const committedWork = workItems.filter((w) => w.status !== 'done' && w.status !== 'cancelled').length;
    const atRiskItems = workItems.filter(
      (w) => (w.priority === 'P1' || w.priority === 'critical') && w.status !== 'done',
    );

    const completedWithCycleTime = workItems.filter((w) => w.status === 'done' && w.cycleTime);
    const avgCycleTime = completedWithCycleTime.length > 0
      ? Math.round((completedWithCycleTime.reduce((s, w) => s + (w.cycleTime || 0), 0) / completedWithCycleTime.length) * 10) / 10
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
      committedWork,
      atRiskWork: atRiskItems.length,
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
