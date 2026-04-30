import {
  Controller, Get, Post, Param, Query, Body, UseGuards,
} from '@nestjs/common';
import { CapacityService } from './capacity.service';
import { CreatePeriodDto } from './dto/create-period.dto';
import { SetAvailabilityDto } from './dto/set-availability.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('capacity')
@UseGuards(JwtAuthGuard)
export class CapacityController {
  constructor(private capacityService: CapacityService) {}

  @Get('periods')
  async getPeriods() {
    return this.capacityService.getCapacityPeriods();
  }

  @Post('periods')
  async createPeriod(@Body() dto: CreatePeriodDto) {
    return this.capacityService.createCapacityPeriod(dto);
  }

  @Get('summary')
  async getSummary(@Query('start') start: string, @Query('end') end: string) {
    return this.capacityService.getCapacitySummary(start, end);
  }

  @Get('team/:teamId')
  async getTeamCapacity(
    @Param('teamId') teamId: string,
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    return this.capacityService.calculateTeamCapacity(teamId, start, end);
  }

  @Get('team/:teamId/velocity')
  async getTeamVelocity(
    @Param('teamId') teamId: string,
    @Query('sprintCount') sprintCount: string,
  ) {
    const count = sprintCount ? parseInt(sprintCount, 10) : 6;
    return this.capacityService.getVelocityCapacity(teamId, count);
  }

  @Post('availability')
  async setAvailability(@Body() dto: SetAvailabilityDto) {
    return this.capacityService.setAvailability(dto);
  }

  @Get('availability/:teamMemberId')
  async getAvailability(
    @Param('teamMemberId') teamMemberId: string,
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    return this.capacityService.getAvailability(teamMemberId, start, end);
  }
}
