import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InsightsService {
  constructor(private prisma: PrismaService) {}

  async getInsights() {
    return this.prisma.insight.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  async generateInsights() {
    const insights: { type: string; severity: string; message: string; metadata?: any }[] = [];

    const capacityInsights = await this.checkTeamCapacity();
    insights.push(...capacityInsights);

    const unassignedInsights = await this.checkUnassignedHighPriority();
    insights.push(...unassignedInsights);

    const planInsights = await this.checkQuarterPlanCapacity();
    insights.push(...planInsights);

    const cycleInsights = await this.checkCycleTime();
    insights.push(...cycleInsights);

    // Clear old insights and save new ones
    await this.prisma.insight.deleteMany({});
    const created = await Promise.all(
      insights.map((insight) =>
        this.prisma.insight.create({ data: insight }),
      ),
    );

    return created;
  }

  private async checkTeamCapacity() {
    const insights: { type: string; severity: string; message: string; metadata?: any }[] = [];
    const teams = await this.prisma.team.findMany({
      include: {
        members: true,
        workItems: { where: { status: { notIn: ['done', 'cancelled'] } } },
      },
    });

    for (const team of teams) {
      if (team.members.length === 0) continue;
      const weeklyCapacity = team.members.reduce((sum, m) => sum + m.weeklyCapacity, 0);
      // Rough: 1 story point ≈ 4 hours, assume 2-week sprint
      const committedHours = team.workItems.reduce((sum, w) => sum + (w.storyPoints || 0) * 4, 0);
      const sprintCapacity = weeklyCapacity * 2;
      const utilization = sprintCapacity > 0 ? (committedHours / sprintCapacity) * 100 : 0;

      if (utilization > 100) {
        insights.push({
          type: 'over_capacity',
          severity: 'warning',
          message: `${team.name} is over capacity by ${Math.round(utilization - 100)}%`,
          metadata: { teamId: team.id, utilization: Math.round(utilization) },
        });
      }
    }
    return insights;
  }

  private async checkUnassignedHighPriority() {
    const insights: { type: string; severity: string; message: string; metadata?: any }[] = [];
    const teams = await this.prisma.team.findMany({
      include: {
        workItems: {
          where: {
            priority: { in: ['P1', 'critical', 'high'] },
            assignee: null,
            status: { notIn: ['done', 'cancelled'] },
          },
        },
      },
    });

    for (const team of teams) {
      if (team.workItems.length > 0) {
        insights.push({
          type: 'unassigned_high_priority',
          severity: 'warning',
          message: `${team.name} has ${team.workItems.length} high-priority item(s) without an owner`,
          metadata: { teamId: team.id, count: team.workItems.length },
        });
      }
    }
    return insights;
  }

  private async checkQuarterPlanCapacity() {
    const insights: { type: string; severity: string; message: string; metadata?: any }[] = [];
    const activePlans = await this.prisma.quarterPlan.findMany({
      where: { status: 'active' },
      include: {
        initiatives: {
          include: { team: { include: { members: true } } },
        },
      },
    });

    for (const plan of activePlans) {
      const weeks = Math.max(1, Math.ceil((plan.endDate.getTime() - plan.startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)));
      const teamEffort = new Map<string, { name: string; estimated: number; capacity: number }>();

      for (const init of plan.initiatives) {
        if (init.teamId && init.team) {
          const existing = teamEffort.get(init.teamId) || {
            name: init.team.name,
            estimated: 0,
            capacity: init.team.members.reduce((s, m) => s + m.weeklyCapacity, 0) * weeks,
          };
          existing.estimated += init.estimatedEffort || 0;
          teamEffort.set(init.teamId, existing);
        }
      }

      for (const [teamId, data] of teamEffort) {
        if (data.estimated > data.capacity) {
          insights.push({
            type: 'plan_over_capacity',
            severity: 'error',
            message: `${plan.name} has more committed work than available capacity for ${data.name}`,
            metadata: { quarterPlanId: plan.id, teamId, estimated: data.estimated, capacity: data.capacity },
          });
        }
      }
    }
    return insights;
  }

  private async checkCycleTime() {
    const insights: { type: string; severity: string; message: string; metadata?: any }[] = [];
    const completedItems = await this.prisma.workItem.findMany({
      where: { status: 'done', cycleTime: { not: null } },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });

    if (completedItems.length < 10) return insights;

    const half = Math.floor(completedItems.length / 2);
    const recentAvg = completedItems.slice(0, half).reduce((s, w) => s + (w.cycleTime || 0), 0) / half;
    const olderAvg = completedItems.slice(half).reduce((s, w) => s + (w.cycleTime || 0), 0) / (completedItems.length - half);

    if (recentAvg > olderAvg * 1.2) {
      insights.push({
        type: 'cycle_time_increase',
        severity: 'info',
        message: `Cycle time increased ${Math.round(((recentAvg - olderAvg) / olderAvg) * 100)}% compared to previous period`,
        metadata: { recentAvg: Math.round(recentAvg * 10) / 10, olderAvg: Math.round(olderAvg * 10) / 10 },
      });
    }
    return insights;
  }
}
