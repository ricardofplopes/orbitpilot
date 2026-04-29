import { Body, Controller, Get, Logger, Post, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JiraService } from './jira.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@Controller('integrations/jira')
export class JiraController {
  private readonly logger = new Logger(JiraController.name);

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

  @Post('connect-token')
  @UseGuards(JwtAuthGuard)
  async connectWithToken(@Body() body: { baseUrl: string; email: string; apiToken: string }) {
    return this.jiraService.connectWithApiToken(body.baseUrl, body.email, body.apiToken);
  }

  // No auth guard — called by Atlassian's OAuth redirect
  @Get('callback')
  async handleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Query('error_description') errorDescription: string,
    @Res() res: Response,
  ) {
    const appUrl = process.env.APP_URL || 'http://localhost:3200';

    if (error) {
      this.logger.warn(`Jira OAuth denied: ${error} - ${errorDescription}`);
      return res.redirect(`${appUrl}/integrations?error=${encodeURIComponent(errorDescription || error)}`);
    }

    try {
      const redirectUrl = await this.jiraService.handleCallback(code, state);
      return res.redirect(redirectUrl);
    } catch (err: any) {
      this.logger.error(`Jira OAuth callback failed: ${err.message}`, err.stack);
      return res.redirect(`${appUrl}/integrations?error=${encodeURIComponent(err.message || 'OAuth callback failed')}`);
    }
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
