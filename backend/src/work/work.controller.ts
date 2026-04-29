import {
  Controller, Get, Post, Put, Delete, Param, Query, Body, UseGuards,
} from '@nestjs/common';
import { WorkService } from './work.service';
import { CreateWorkItemDto } from './dto/create-work-item.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('work')
@UseGuards(JwtAuthGuard)
export class WorkController {
  constructor(private workService: WorkService) {}

  @Get('summary')
  async getSummary() {
    return this.workService.getWorkSummary();
  }

  @Get()
  async findAll(
    @Query('teamId') teamId?: string,
    @Query('status') status?: string,
    @Query('source') source?: string,
    @Query('initiativeId') initiativeId?: string,
  ) {
    return this.workService.findAll({ teamId, status, source, initiativeId });
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
  async update(@Param('id') id: string, @Body() dto: Partial<CreateWorkItemDto>) {
    return this.workService.update(id, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.workService.delete(id);
  }
}
