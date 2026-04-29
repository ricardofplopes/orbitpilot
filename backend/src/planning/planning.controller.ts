import {
  Controller, Get, Post, Put, Delete, Param, Body, UseGuards,
} from '@nestjs/common';
import { PlanningService } from './planning.service';
import { CreateQuarterDto } from './dto/create-quarter.dto';
import { CreateInitiativeDto } from './dto/create-initiative.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('planning')
@UseGuards(JwtAuthGuard)
export class PlanningController {
  constructor(private planningService: PlanningService) {}

  @Get('quarters')
  async getQuarters() {
    return this.planningService.getQuarterPlans();
  }

  @Post('quarters')
  async createQuarter(@Body() dto: CreateQuarterDto) {
    return this.planningService.createQuarterPlan(dto);
  }

  @Get('quarters/:id')
  async getQuarter(@Param('id') id: string) {
    return this.planningService.getQuarterPlanById(id);
  }

  @Put('quarters/:id')
  async updateQuarter(@Param('id') id: string, @Body() dto: Partial<CreateQuarterDto>) {
    return this.planningService.updateQuarterPlan(id, dto);
  }

  @Get('quarters/:id/initiatives')
  async getInitiatives(@Param('id') id: string) {
    return this.planningService.getInitiatives(id);
  }

  @Post('quarters/:id/initiatives')
  async createInitiative(@Param('id') id: string, @Body() dto: CreateInitiativeDto) {
    return this.planningService.createInitiative(id, dto);
  }

  @Put('initiatives/:id')
  async updateInitiative(@Param('id') id: string, @Body() dto: Partial<CreateInitiativeDto>) {
    return this.planningService.updateInitiative(id, dto);
  }

  @Delete('initiatives/:id')
  async deleteInitiative(@Param('id') id: string) {
    return this.planningService.deleteInitiative(id);
  }
}
