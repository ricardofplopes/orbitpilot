import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('team/:teamId')
  async getTeamReport(@Param('teamId') teamId: string) {
    return this.reportsService.getTeamReport(teamId);
  }

  @Get('quarter/:quarterPlanId')
  async getQuarterReport(@Param('quarterPlanId') quarterPlanId: string) {
    return this.reportsService.getQuarterReport(quarterPlanId);
  }

  @Get('overall')
  async getOverallReport() {
    return this.reportsService.getOverallReport();
  }
}
