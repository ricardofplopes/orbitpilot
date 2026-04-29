import { Controller, Get, Post, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JiraService } from './jira.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@Controller('integrations/jira')
export class JiraController {
  constructor(private jiraService: JiraService) {}

  @Get('config')
  @UseGuards(JwtAuthGuard)
  async getConfig() {
    return this.jiraService.getConfig();
  }

  @Get('auth-url')
  @UseGuards(JwtAuthGuard)
  getAuthUrl() {
    return this.jiraService.getAuthUrl();
  }

  // No auth guard — called by Atlassian's OAuth redirect
  @Get('callback')
  async handleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const redirectUrl = await this.jiraService.handleCallback(code, state);
    return res.redirect(redirectUrl);
  }

  @Post('disconnect')
  @UseGuards(JwtAuthGuard)
  async disconnect() {
    return this.jiraService.disconnect();
  }

  @Get('issues')
  @UseGuards(JwtAuthGuard)
  async getIssues() {
    return this.jiraService.getIssues();
  }
}
