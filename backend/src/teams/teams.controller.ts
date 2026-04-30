import {
  Controller, Get, Post, Put, Delete, Param, Body, UseGuards,
} from '@nestjs/common';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('teams')
@UseGuards(JwtAuthGuard)
export class TeamsController {
  constructor(private teamsService: TeamsService) {}

  @Get()
  async findAll() {
    return this.teamsService.findAll();
  }

  @Post()
  async create(@Body() dto: CreateTeamDto) {
    return this.teamsService.create(dto);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.teamsService.findById(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: Partial<CreateTeamDto>) {
    return this.teamsService.update(id, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.teamsService.delete(id);
  }

  @Post(':id/members')
  async addMember(@Param('id') id: string, @Body() dto: AddMemberDto) {
    return this.teamsService.addMember(id, dto);
  }

  @Delete(':id/members/:memberId')
  async removeMember(@Param('id') id: string, @Param('memberId') memberId: string) {
    return this.teamsService.removeMember(id, memberId);
  }

  @Get(':id/member-stats')
  async getMemberStats(@Param('id') id: string) {
    return this.teamsService.getMemberStats(id);
  }
}
