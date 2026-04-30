import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePeriodDto } from './dto/create-period.dto';
import { SetAvailabilityDto } from './dto/set-availability.dto';

/** Extract year and sprint number for sorting */
function parseSprintNumber(name: string): [number, number] {
  const m = name.match(/(\d{4})[.\-](\d+)\s*$/);
  if (m) return [parseInt(m[1]), parseInt(m[2])];
  return [0, 0];
}

function sprintSortDesc(a: string, b: string): number {
  const [aYear, aNum] = parseSprintNumber(a);
  const [bYear, bNum] = parseSprintNumber(b);
  if (bYear !== aYear) return bYear - aYear;
  return bNum - aNum;
}

@Injectable()
export class CapacityService {
  constructor(private prisma: PrismaService) {}

  async getCapacityPeriods() {
    return this.prisma.capacityPeriod.findMany({ orderBy: { startDate: 'desc' } });
  }

  async createCapacityPeriod(dto: CreatePeriodDto) {
    return this.prisma.capacityPeriod.create({
      data: {
        name: dto.name,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
      },
    });
  }

  async getAvailability(teamMemberId: string, startDate: string, endDate: string) {
    return this.prisma.availability.findMany({
      where: {
        teamMemberId,
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      orderBy: { date: 'asc' },
    });
  }

  async setAvailability(dto: SetAvailabilityDto) {
    return this.prisma.availability.create({
      data: {
        teamMemberId: dto.teamMemberId,
        date: new Date(dto.date),
        type: dto.type,
        hours: dto.hours,
      },
    });
  }

  async deleteAvailability(id: string) {
    await this.prisma.availability.delete({ where: { id } });
    return { success: true };
  }

  /** Get all PTO/availability entries for a team in a date range */
  async getTeamAvailability(teamId: string, startDate: string, endDate: string) {
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date(start.getFullYear(), start.getMonth() + 1, 0);

    const members = await this.prisma.teamMember.findMany({
      where: { teamId, isActive: true },
      include: {
        user: { select: { name: true } },
        availability: {
          where: { date: { gte: start, lte: end } },
          orderBy: { date: 'asc' },
        },
      },
    });

    const entries: Array<{
      id: string;
      memberId: string;
      memberName: string;
      date: string;
      type: string;
      hours: number;
    }> = [];

    for (const m of members) {
      for (const a of m.availability) {
        entries.push({
          id: a.id,
          memberId: m.id,
          memberName: m.user.name,
          date: a.date.toISOString().split('T')[0],
          type: a.type,
          hours: a.hours,
        });
      }
    }

    return entries;
  }

  async calculateTeamCapacity(teamId: string, startDate?: string, endDate?: string) {
    // Default to current quarter if no dates provided
    const now = new Date();
    const effectiveStart = startDate ? new Date(startDate) : new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    const effectiveEnd = endDate ? new Date(endDate) : new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0);

    const members = await this.prisma.teamMember.findMany({
      where: { teamId, isActive: true },
      include: {
        availability: {
          where: {
            date: { gte: effectiveStart, lte: effectiveEnd },
          },
        },
        user: { select: { name: true } },
      },
    });

    const weeks = Math.max(1, Math.ceil((effectiveEnd.getTime() - effectiveStart.getTime()) / (7 * 24 * 60 * 60 * 1000)));

    let totalCapacity = 0;
    let totalPtoHours = 0;
    const memberCapacities = members.map((m) => {
      const baseCapacity = m.weeklyCapacity * weeks;
      const ptoHours = m.availability
        .filter((a) => a.type === 'pto' || a.type === 'holiday')
        .reduce((sum, a) => sum + a.hours, 0);
      const available = baseCapacity - ptoHours;
      totalCapacity += baseCapacity;
      totalPtoHours += ptoHours;
      return {
        memberId: m.id,
        memberName: m.user.name,
        baseCapacity,
        ptoHours,
        availableHours: available,
      };
    });

    return {
      teamId,
      weeks,
      totalBaseCapacity: totalCapacity,
      totalPtoHours,
      totalAvailableHours: totalCapacity - totalPtoHours,
      members: memberCapacities,
    };
  }

  async getCapacitySummary(startDate: string, endDate: string) {
    // Default to current quarter if no dates provided
    const now = new Date();
    const effectiveStart = startDate ? new Date(startDate) : new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    const effectiveEnd = endDate ? new Date(endDate) : new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0);

    const teams = await this.prisma.team.findMany({
      include: {
        members: {
          include: {
            availability: {
              where: {
                date: { gte: effectiveStart, lte: effectiveEnd },
              },
            },
          },
        },
        workItems: true,
      },
    });

    const weeks = Math.max(1, Math.ceil((effectiveEnd.getTime() - effectiveStart.getTime()) / (7 * 24 * 60 * 60 * 1000)));

    return teams.map((team) => {
      const baseCapacity = team.members.reduce((sum, m) => sum + m.weeklyCapacity * weeks, 0);
      const ptoHours = team.members.reduce(
        (sum, m) =>
          sum +
          m.availability
            .filter((a) => a.type === 'pto' || a.type === 'holiday')
            .reduce((s, a) => s + a.hours, 0),
        0,
      );
      const available = baseCapacity - ptoHours;
      const committedPoints = team.workItems
        .filter((w) => w.status !== 'done' && w.status !== 'cancelled')
        .reduce((sum, w) => sum + (w.storyPoints || 0), 0);
      // Rough conversion: 1 story point ≈ 4 hours
      const committedHours = committedPoints * 4;
      const utilizationPercent = available > 0 ? Math.round((committedHours / available) * 100) : 0;

      return {
        teamId: team.id,
        teamName: team.name,
        color: team.color,
        baseCapacity,
        ptoHours,
        availableHours: available,
        committedHours,
        utilizationPercent,
        memberCount: team.members.length,
      };
    });
  }

  /** Velocity-based capacity: SP/sprint from past closed sprints */
  async getVelocityCapacity(teamId: string, sprintCount: number = 6) {
    const SPRINT_PATTERN = /^(BV BO|VBO)[\s-]/i;

    // Get active team members' emails/names for filtering
    const members = await this.prisma.teamMember.findMany({
      where: { teamId, isActive: true },
      include: { user: { select: { name: true, email: true } } },
    });

    const memberEmails = members.map(m => m.user.email).filter(Boolean);
    const memberNames = members.map(m => m.user.name).filter(Boolean);

    // Get all work items with sprints matching BO pattern, assigned to team members
    const workItems = await this.prisma.workItem.findMany({
      where: {
        sprint: { not: null },
        source: 'jira',
        OR: [
          { assigneeEmail: { in: memberEmails } },
          { assignee: { in: memberNames } },
        ],
      },
      select: {
        sprint: true,
        storyPoints: true,
        status: true,
        assignee: true,
        assigneeEmail: true,
      },
    });

    // Filter to BO sprints only
    const boItems = workItems.filter(w => w.sprint && SPRINT_PATTERN.test(w.sprint));

    // Group by sprint
    const sprintMap = new Map<string, typeof boItems>();
    for (const item of boItems) {
      const s = item.sprint!;
      if (!sprintMap.has(s)) sprintMap.set(s, []);
      sprintMap.get(s)!.push(item);
    }

    // Sort sprints descending (most recent first)
    const allSprints = Array.from(sprintMap.keys()).sort((a, b) => sprintSortDesc(a, b));

    // Detect active sprint: the most recent one that has non-done items
    // For velocity, we skip the active sprint and use the N closed ones after it
    let activeSprint: string | null = null;
    for (const s of allSprints) {
      const items = sprintMap.get(s)!;
      const hasPending = items.some(i => i.status !== 'done' && i.status !== 'cancelled');
      if (hasPending) {
        activeSprint = s;
        break;
      }
    }

    // Closed sprints = all except the active one
    const closedSprints = allSprints.filter(s => s !== activeSprint);
    const velocitySprints = closedSprints.slice(0, sprintCount);

    // Calculate velocity per sprint
    const sprintVelocity = velocitySprints.map(s => {
      const items = sprintMap.get(s)!;
      const totalSP = items.reduce((sum, i) => sum + (i.storyPoints || 0), 0);
      const itemCount = items.length;
      return { sprint: s, storyPoints: totalSP, itemCount };
    });

    const avgVelocity = sprintVelocity.length > 0
      ? Math.round(sprintVelocity.reduce((sum, s) => sum + s.storyPoints, 0) / sprintVelocity.length)
      : 0;

    // Committed SP: items in active/future sprints that are not done
    const committedItems = activeSprint
      ? (sprintMap.get(activeSprint) || []).filter(i => i.status !== 'done' && i.status !== 'cancelled')
      : [];
    const committedSP = committedItems.reduce((sum, i) => sum + (i.storyPoints || 0), 0);

    // Per-member velocity (from closed sprints used for velocity)
    const memberVelocityMap = new Map<string, { name: string; totalSP: number; sprintCount: number }>();
    for (const s of velocitySprints) {
      const items = sprintMap.get(s)!;
      for (const item of items) {
        const key = item.assigneeEmail || item.assignee || 'Unassigned';
        const name = item.assignee || item.assigneeEmail || 'Unassigned';
        if (!memberVelocityMap.has(key)) {
          memberVelocityMap.set(key, { name, totalSP: 0, sprintCount: 0 });
        }
        const mv = memberVelocityMap.get(key)!;
        mv.totalSP += item.storyPoints || 0;
      }
    }
    // Set sprint count for each member (they participated in some of the sprints)
    for (const mv of memberVelocityMap.values()) {
      mv.sprintCount = velocitySprints.length;
    }

    const memberVelocity = Array.from(memberVelocityMap.values())
      .map(mv => ({
        name: mv.name,
        totalSP: mv.totalSP,
        avgSPPerSprint: mv.sprintCount > 0 ? Math.round((mv.totalSP / mv.sprintCount) * 10) / 10 : 0,
      }))
      .sort((a, b) => b.totalSP - a.totalSP);

    return {
      teamId,
      sprintCount: velocitySprints.length,
      avgVelocity,
      committedSP,
      activeSprint,
      capacityDelta: avgVelocity - committedSP, // positive = under capacity, negative = over
      sprintVelocity: sprintVelocity.reverse(), // chronological order for chart
      memberVelocity,
    };
  }
}
