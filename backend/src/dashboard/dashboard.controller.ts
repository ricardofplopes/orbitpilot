import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get()
  async getDashboard(
    @Query('teamId') teamId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('sprints') sprints?: string,
  ) {
    const sprintList = sprints ? sprints.split(',').filter(Boolean) : undefined;
    return this.dashboardService.getDashboardData(teamId, startDate, endDate, sprintList);
  }

  @Get('sprints')
  async getSprints(@Query('teamId') teamId?: string) {
    return this.dashboardService.getAvailableSprints(teamId);
  }
}
