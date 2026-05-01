import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private settings: SettingsService) {}

  @Get('tshirt-map')
  async getTShirtMap() {
    return this.settings.getTShirtMap();
  }

  @Put('tshirt-map')
  async updateTShirtMap(@Body() body: Record<string, number>) {
    return this.settings.updateTShirtMap(body);
  }
}
