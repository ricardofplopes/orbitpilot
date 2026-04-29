import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuarterDto } from './dto/create-quarter.dto';
import { CreateInitiativeDto } from './dto/create-initiative.dto';

@Injectable()
export class PlanningService {
  constructor(private prisma: PrismaService) {}

  async getQuarterPlans() {
    return this.prisma.quarterPlan.findMany({
      include: {
        initiatives: {
          include: { team: { select: { id: true, name: true, color: true } } },
        },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  async createQuarterPlan(dto: CreateQuarterDto) {
    return this.prisma.quarterPlan.create({
      data: {
        name: dto.name,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
      },
    });
  }

  async getQuarterPlanById(id: string) {
    const plan = await this.prisma.quarterPlan.findUnique({
      where: { id },
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
    return plan;
  }

  async updateQuarterPlan(id: string, data: Partial<CreateQuarterDto & { status: string }>) {
    const plan = await this.prisma.quarterPlan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Quarter plan not found');
    return this.prisma.quarterPlan.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.startDate && { startDate: new Date(data.startDate) }),
        ...(data.endDate && { endDate: new Date(data.endDate) }),
        ...(data.status && { status: data.status }),
      },
    });
  }

  async getInitiatives(quarterPlanId: string) {
    return this.prisma.initiative.findMany({
      where: { quarterPlanId },
      include: {
        team: { select: { id: true, name: true, color: true } },
        workItems: true,
      },
    });
  }

  async createInitiative(quarterPlanId: string, dto: CreateInitiativeDto) {
    const plan = await this.prisma.quarterPlan.findUnique({ where: { id: quarterPlanId } });
    if (!plan) throw new NotFoundException('Quarter plan not found');
    return this.prisma.initiative.create({
      data: {
        quarterPlanId,
        title: dto.title,
        description: dto.description,
        teamId: dto.teamId,
        priority: dto.priority || 'P2',
        estimatedEffort: dto.estimatedEffort,
      },
      include: { team: { select: { id: true, name: true, color: true } } },
    });
  }

  async updateInitiative(id: string, data: Partial<CreateInitiativeDto & { status: string }>) {
    const initiative = await this.prisma.initiative.findUnique({ where: { id } });
    if (!initiative) throw new NotFoundException('Initiative not found');
    return this.prisma.initiative.update({
      where: { id },
      data,
      include: { team: { select: { id: true, name: true, color: true } } },
    });
  }

  async deleteInitiative(id: string) {
    const initiative = await this.prisma.initiative.findUnique({ where: { id } });
    if (!initiative) throw new NotFoundException('Initiative not found');
    await this.prisma.initiative.delete({ where: { id } });
    return { deleted: true };
  }

  async getCapacityImpact(quarterPlanId: string) {
    const plan = await this.prisma.quarterPlan.findUnique({
      where: { id: quarterPlanId },
      include: {
        initiatives: {
          include: { team: true },
        },
      },
    });
    if (!plan) throw new NotFoundException('Quarter plan not found');

    const start = plan.startDate.toISOString();
    const end = plan.endDate.toISOString();
    const weeks = Math.max(1, Math.ceil((plan.endDate.getTime() - plan.startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)));

    // Group initiatives by team
    const teamEffort = new Map<string, { teamName: string; estimatedHours: number }>();
    for (const init of plan.initiatives) {
      if (init.teamId && init.team) {
        const existing = teamEffort.get(init.teamId) || { teamName: init.team.name, estimatedHours: 0 };
        existing.estimatedHours += init.estimatedEffort || 0;
        teamEffort.set(init.teamId, existing);
      }
    }

    // Get team capacities
    const teamIds = [...teamEffort.keys()];
    const teams = await this.prisma.team.findMany({
      where: { id: { in: teamIds } },
      include: {
        members: {
          include: {
            availability: {
              where: {
                date: { gte: plan.startDate, lte: plan.endDate },
              },
            },
          },
        },
      },
    });

    const impact = teams.map((team) => {
      const baseCapacity = team.members.reduce((sum, m) => sum + m.weeklyCapacity * weeks, 0);
      const ptoHours = team.members.reduce(
        (sum, m) => sum + m.availability.filter((a) => a.type === 'pto' || a.type === 'holiday').reduce((s, a) => s + a.hours, 0),
        0,
      );
      const available = baseCapacity - ptoHours;
      const effort = teamEffort.get(team.id);
      const estimated = effort?.estimatedHours || 0;
      const delta = available - estimated;

      return {
        teamId: team.id,
        teamName: team.name,
        availableHours: available,
        estimatedHours: estimated,
        deltaHours: delta,
        overCapacity: delta < 0,
        utilizationPercent: available > 0 ? Math.round((estimated / available) * 100) : 0,
      };
    });

    return { quarterPlanId, planName: plan.name, teams: impact };
  }
}
