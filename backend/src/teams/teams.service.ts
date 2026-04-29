import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { AddMemberDto } from './dto/add-member.dto';

@Injectable()
export class TeamsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.team.findMany({
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        },
        _count: { select: { workItems: true, initiatives: true } },
      },
    });
  }

  async findById(id: string) {
    const team = await this.prisma.team.findUnique({
      where: { id },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        },
        initiatives: true,
        workItems: true,
      },
    });
    if (!team) throw new NotFoundException('Team not found');
    return team;
  }

  async create(dto: CreateTeamDto) {
    return this.prisma.team.create({ data: dto });
  }

  async update(id: string, dto: Partial<CreateTeamDto>) {
    const team = await this.prisma.team.findUnique({ where: { id } });
    if (!team) throw new NotFoundException('Team not found');
    return this.prisma.team.update({ where: { id }, data: dto });
  }

  async delete(id: string) {
    const team = await this.prisma.team.findUnique({ where: { id } });
    if (!team) throw new NotFoundException('Team not found');
    await this.prisma.team.delete({ where: { id } });
    return { deleted: true };
  }

  async addMember(teamId: string, dto: AddMemberDto) {
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team) throw new NotFoundException('Team not found');
    return this.prisma.teamMember.create({
      data: {
        teamId,
        userId: dto.userId,
        role: dto.role || 'engineer',
        weeklyCapacity: dto.weeklyCapacity || 40,
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  }

  async removeMember(teamId: string, memberId: string) {
    const member = await this.prisma.teamMember.findFirst({
      where: { id: memberId, teamId },
    });
    if (!member) throw new NotFoundException('Team member not found');
    await this.prisma.teamMember.delete({ where: { id: memberId } });
    return { deleted: true };
  }

  async getTeamWithMembers(teamId: string) {
    return this.findById(teamId);
  }

  async getAllTeamsWithMembers() {
    return this.findAll();
  }
}
