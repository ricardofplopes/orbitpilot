import {
  Controller, Get, Post, Put, Delete, Param, Query, Body, UseGuards,
} from '@nestjs/common';
import { WorkService } from './work.service';
import { CreateWorkItemDto, UpdateWorkItemDto } from './dto/create-work-item.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('work')
@UseGuards(JwtAuthGuard)
export class WorkController {
  constructor(private workService: WorkService) {}

  @Get('summary')
  async getSummary() {
    return this.workService.getWorkSummary();
  }

  @Get('releases')
  async getReleases(@Query('teamId') teamId?: string, @Query('status') status?: string) {
    return this.workService.getReleases(teamId, status);
  }

  @Get('releases/:id')
  async getReleaseDetails(@Param('id') id: string, @Query('teamId') teamId?: string) {
    return this.workService.getReleaseDetails(id, teamId);
  }

  @Get()
  async findAll(
    @Query('teamId') teamId?: string,
    @Query('status') status?: string,
    @Query('source') source?: string,
    @Query('initiativeId') initiativeId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('sprints') sprints?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const sprintList = sprints ? sprints.split(',').filter(Boolean) : undefined;
    return this.workService.findAll({
      teamId, status, source, initiativeId,
      startDate, endDate, sprints: sprintList,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Post()
  async create(@Body() dto: CreateWorkItemDto) {
    return this.workService.create(dto);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.workService.findById(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateWorkItemDto) {
    return this.workService.update(id, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.workService.delete(id);
  }
}
