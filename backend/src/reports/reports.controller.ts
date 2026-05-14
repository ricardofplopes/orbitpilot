import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('team/:teamId')
  async getTeamReport(
    @Param('teamId') teamId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('sprints') sprints?: string,
  ) {
    const sprintList = sprints ? sprints.split(',').filter(Boolean) : undefined;
    return this.reportsService.getTeamReport(teamId, startDate, endDate, sprintList);
  }

  @Get('quarter/:quarterPlanId')
  async getQuarterReport(@Param('quarterPlanId') quarterPlanId: string) {
    return this.reportsService.getQuarterReport(quarterPlanId);
  }

  @Get('overall')
  async getOverallReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('sprints') sprints?: string,
  ) {
    const sprintList = sprints ? sprints.split(',').filter(Boolean) : undefined;
    return this.reportsService.getOverallReport(startDate, endDate, sprintList);
  }
}
