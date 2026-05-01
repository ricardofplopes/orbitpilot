import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuarterDto, UpdateQuarterDto } from './dto/create-quarter.dto';
import { CreateInitiativeDto, UpdateInitiativeDto } from './dto/create-initiative.dto';
import { SettingsService } from '../settings/settings.service';

/** Parse a quarter label like "Q3 2026" / "FY26 Q3" / "2026 Q3" into {year, quarter} for sorting */
function parseQuarter(label: string): { year: number; quarter: number } | null {
  if (!label) return null;
  const s = label.toUpperCase().trim();
  // Match "Q3 2026" or "Q3-2026"
  let m = s.match(/Q\s*(\d)\D+(\d{2,4})/);
  if (m) {
    let y = parseInt(m[2], 10);
    if (y < 100) y += 2000;
    return { year: y, quarter: parseInt(m[1], 10) };
  }
  // Match "2026 Q3" or "2026-Q3"
  m = s.match(/(\d{4}).*?Q\s*(\d)/);
  if (m) return { year: parseInt(m[1], 10), quarter: parseInt(m[2], 10) };
  // Match "FY26 Q3"
  m = s.match(/FY\s*(\d{2,4}).*?Q\s*(\d)/);
  if (m) {
    let y = parseInt(m[1], 10);
    if (y < 100) y += 2000;
    return { year: y, quarter: parseInt(m[2], 10) };
  }
  return null;
}

function sortQuartersDesc(a: string, b: string): number {
  const pa = parseQuarter(a);
  const pb = parseQuarter(b);
  if (pa && pb) {
    if (pa.year !== pb.year) return pb.year - pa.year;
    return pb.quarter - pa.quarter;
  }
  if (pa) return -1;
  if (pb) return 1;
  return b.localeCompare(a);
}

@Injectable()
export class PlanningService {
  constructor(
    private prisma: PrismaService,
    private settings: SettingsService,
  ) {}

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

  async updateQuarterPlan(id: string, data: UpdateQuarterDto) {
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

  async updateInitiative(id: string, data: UpdateInitiativeDto) {
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

  // ===== Epic-based planning (replaces Initiative concept) =====

  /** Get distinct quarter values from synced epics, sorted most-recent first */
  async getEpicQuarters(): Promise<string[]> {
    const rows = await this.prisma.workItem.findMany({
      where: { source: 'jira', type: 'Epic', quarter: { not: null } },
      select: { quarter: true },
      distinct: ['quarter'],
    });
    const quarters = rows.map((r) => r.quarter!).filter(Boolean);
    quarters.sort(sortQuartersDesc);
    return quarters;
  }

  /** Get all epics for a given quarter, plus child issue rollup */
  async getEpicsByQuarter(quarter: string) {
    const epics = await this.prisma.workItem.findMany({
      where: { source: 'jira', type: 'Epic', quarter },
      include: { team: { select: { id: true, name: true, color: true } } },
      orderBy: { externalId: 'asc' },
    });

    if (epics.length === 0) return [];

    const epicKeys = epics.map((e) => e.externalId).filter(Boolean) as string[];
    // Aggregate child issues per epic
    const children = await this.prisma.workItem.findMany({
      where: { source: 'jira', epicKey: { in: epicKeys } },
      select: { epicKey: true, status: true, storyPoints: true },
    });

    const childStats = new Map<string, { total: number; done: number; sp: number; doneSp: number }>();
    for (const c of children) {
      if (!c.epicKey) continue;
      const s = childStats.get(c.epicKey) || { total: 0, done: 0, sp: 0, doneSp: 0 };
      s.total += 1;
      s.sp += c.storyPoints || 0;
      if (c.status === 'done') {
        s.done += 1;
        s.doneSp += c.storyPoints || 0;
      }
      childStats.set(c.epicKey, s);
    }

    const tShirtMap = await this.settings.getTShirtMap();

    return epics.map((e) => {
      const stats = (e.externalId && childStats.get(e.externalId)) || { total: 0, done: 0, sp: 0, doneSp: 0 };
      const sizedSp = e.tShirtSize ? (tShirtMap[e.tShirtSize.toUpperCase()] ?? null) : null;
      return {
        id: e.id,
        key: e.externalId,
        title: e.title,
        status: e.status,
        priority: e.priority,
        team: e.team,
        teamId: e.teamId,
        tShirtSize: e.tShirtSize,
        sizedStoryPoints: sizedSp,
        storyPoints: e.storyPoints,
        quarter: e.quarter,
        externalUrl: e.externalUrl,
        children: stats,
      };
    });
  }

  /** Capacity impact for a given quarter using t-shirt SP map */
  async getQuarterImpact(quarter: string) {
    const epics = await this.getEpicsByQuarter(quarter);
    const tShirtMap = await this.settings.getTShirtMap();

    const teamTotals = new Map<string, { teamId: string; teamName: string; color?: string; estimatedSp: number; epicCount: number; unsizedCount: number }>();
    let totalSp = 0;
    let unsizedCount = 0;

    for (const e of epics) {
      const sp = e.tShirtSize ? (tShirtMap[e.tShirtSize.toUpperCase()] ?? 0) : 0;
      if (!e.tShirtSize) unsizedCount += 1;
      totalSp += sp;

      const tid = e.teamId || 'unassigned';
      const tname = e.team?.name || 'Unassigned';
      const existing = teamTotals.get(tid) || { teamId: tid, teamName: tname, color: e.team?.color || undefined, estimatedSp: 0, epicCount: 0, unsizedCount: 0 };
      existing.estimatedSp += sp;
      existing.epicCount += 1;
      if (!e.tShirtSize) existing.unsizedCount += 1;
      teamTotals.set(tid, existing);
    }

    return {
      quarter,
      epicCount: epics.length,
      unsizedCount,
      totalEstimatedSp: totalSp,
      tShirtMap,
      teams: Array.from(teamTotals.values()).sort((a, b) => b.estimatedSp - a.estimatedSp),
    };
  }
}
