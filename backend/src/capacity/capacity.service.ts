import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePeriodDto } from './dto/create-period.dto';
import { SetAvailabilityDto } from './dto/set-availability.dto';

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

  async calculateTeamCapacity(teamId: string, startDate: string, endDate: string) {
    const members = await this.prisma.teamMember.findMany({
      where: { teamId },
      include: {
        availability: {
          where: {
            date: { gte: new Date(startDate), lte: new Date(endDate) },
          },
        },
        user: { select: { name: true } },
      },
    });

    const start = new Date(startDate);
    const end = new Date(endDate);
    const weeks = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)));

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
    const teams = await this.prisma.team.findMany({
      include: {
        members: {
          include: {
            availability: {
              where: {
                date: { gte: new Date(startDate), lte: new Date(endDate) },
              },
            },
          },
        },
        workItems: true,
      },
    });

    const start = new Date(startDate);
    const end = new Date(endDate);
    const weeks = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)));

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
}
