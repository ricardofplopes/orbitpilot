import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { buildWorkItemWhere } from '../common/work-item-filter';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getTeamReport(teamId: string, startDate?: string, endDate?: string, sprints?: string[]) {
    const workWhere = buildWorkItemWhere({ teamId, startDate, endDate, sprints });
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        workItems: true,
        initiatives: true,
      },
    });
    if (!team) throw new NotFoundException('Team not found');
    const filteredWorkItems = await this.prisma.workItem.findMany({ where: workWhere });

    const workByStatus = {
      todo: filteredWorkItems.filter((w) => w.status === 'todo').length,
      in_progress: filteredWorkItems.filter((w) => w.status === 'in_progress').length,
      in_review: filteredWorkItems.filter((w) => w.status === 'in_review').length,
      done: filteredWorkItems.filter((w) => w.status === 'done').length,
    };

    const totalPoints = filteredWorkItems.reduce((s, w) => s + (w.storyPoints || 0), 0);
    const completedPoints = filteredWorkItems
      .filter((w) => w.status === 'done')
      .reduce((s, w) => s + (w.storyPoints || 0), 0);

    const completedWithCycle = filteredWorkItems.filter((w) => w.status === 'done' && w.cycleTime);
    const avgCycleTime = completedWithCycle.length > 0
      ? Math.round((completedWithCycle.reduce((s, w) => s + (w.cycleTime || 0), 0) / completedWithCycle.length) * 10) / 10
      : 0;

    return {
      team: { id: team.id, name: team.name, color: team.color },
      memberCount: team.members.length,
      members: team.members.map((m) => ({ id: m.id, name: m.user.name, role: m.role })),
      workByStatus,
      totalWorkItems: filteredWorkItems.length,
      totalPoints,
      completedPoints,
      completionRate: totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0,
      avgCycleTime,
      initiatives: team.initiatives.map((i) => ({
        id: i.id,
        title: i.title,
        priority: i.priority,
        status: i.status,
      })),
    };
  }

  async getQuarterReport(quarterPlanId: string) {
    const plan = await this.prisma.quarterPlan.findUnique({
      where: { id: quarterPlanId },
      include: {
        initiatives: {
          include: {
            team: { select: { id: true, name: true, color: true } },
            workItems: true,
          },
        },
      },
    });
    if (!plan) throw new NotFoundException('Quarter plan not found');

    const allWorkItems = plan.initiatives.flatMap((i) => i.workItems);
    const totalItems = allWorkItems.length;
    const completedItems = allWorkItems.filter((w) => w.status === 'done').length;

    const initiativeSummary = plan.initiatives.map((i) => {
      const items = i.workItems;
      const done = items.filter((w) => w.status === 'done').length;
      return {
        id: i.id,
        title: i.title,
        priority: i.priority,
        status: i.status,
        team: i.team,
        totalItems: items.length,
        completedItems: done,
        progress: items.length > 0 ? Math.round((done / items.length) * 100) : 0,
      };
    });

    return {
      plan: { id: plan.id, name: plan.name, status: plan.status, startDate: plan.startDate, endDate: plan.endDate },
      totalInitiatives: plan.initiatives.length,
      totalWorkItems: totalItems,
      completedWorkItems: completedItems,
      overallProgress: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
      initiatives: initiativeSummary,
    };
  }

  async getOverallReport(startDate?: string, endDate?: string, sprints?: string[]) {
    const workWhere = buildWorkItemWhere({ startDate, endDate, sprints });
    const [teams, workItems, plans, insights] = await Promise.all([
      this.prisma.team.findMany({ include: { members: true, workItems: true } }),
      this.prisma.workItem.findMany({ where: workWhere }),
      this.prisma.quarterPlan.findMany({ include: { initiatives: true } }),
      this.prisma.insight.findMany({ orderBy: { createdAt: 'desc' }, take: 10 }),
    ]);

    const totalMembers = teams.reduce((s, t) => s + t.members.length, 0);
    const workByStatus = {
      todo: workItems.filter((w) => w.status === 'todo').length,
      in_progress: workItems.filter((w) => w.status === 'in_progress').length,
      in_review: workItems.filter((w) => w.status === 'in_review').length,
      done: workItems.filter((w) => w.status === 'done').length,
    };

    const completedWithCycle = workItems.filter((w) => w.status === 'done' && w.cycleTime);
    const avgCycleTime = completedWithCycle.length > 0
      ? Math.round((completedWithCycle.reduce((s, w) => s + (w.cycleTime || 0), 0) / completedWithCycle.length) * 10) / 10
      : 0;

    const teamWorkMap = new Map<string, { totalWork: number; completedWork: number }>();
    for (const item of workItems) {
      const key = item.teamId || '__unassigned__';
      const current = teamWorkMap.get(key) || { totalWork: 0, completedWork: 0 };
      current.totalWork += 1;
      if (item.status === 'done') current.completedWork += 1;
      teamWorkMap.set(key, current);
    }

    const teamSummaries = teams.map((t) => {
      const stats = teamWorkMap.get(t.id) || { totalWork: 0, completedWork: 0 };
      return {
        id: t.id,
        name: t.name,
        memberCount: t.members.length,
        totalWork: stats.totalWork,
        completedWork: stats.completedWork,
      };
    });

    return {
      totalTeams: teams.length,
      totalMembers,
      totalWorkItems: workItems.length,
      workByStatus,
      avgCycleTime,
      quarterPlans: plans.map((p) => ({
        id: p.id,
        name: p.name,
        status: p.status,
        initiativeCount: p.initiatives.length,
      })),
      teams: teamSummaries,
      recentInsights: insights,
    };
  }
}
