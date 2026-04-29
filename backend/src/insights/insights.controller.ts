import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { InsightsService } from './insights.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('insights')
@UseGuards(JwtAuthGuard)
export class InsightsController {
  constructor(private insightsService: InsightsService) {}

  @Get()
  async getInsights() {
    return this.insightsService.getInsights();
  }

  @Post('generate')
  async generateInsights() {
    return this.insightsService.generateInsights();
  }
}
