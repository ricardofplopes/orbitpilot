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

  @Get('projects')
  @UseGuards(JwtAuthGuard)
  async getProjects() {
    return this.jiraService.getProjects();
  }

  @Post('set-project')
  @UseGuards(JwtAuthGuard)
  async setProject(@Body() body: { projectKey: string }) {
    return this.jiraService.setProject(body.projectKey);
  }

  @Post('sync')
  @UseGuards(JwtAuthGuard)
  async sync() {
    return this.jiraService.syncIssues();
  }

  @Get('issues')
  @UseGuards(JwtAuthGuard)
  async getIssues(
    @Query('assignee') assignee?: string,
    @Query('status') status?: string,
    @Query('sprint') sprint?: string,
  ) {
    return this.jiraService.getIssues({ assignee, status, sprint });
  }

  @Get('issues-by-assignee')
  @UseGuards(JwtAuthGuard)
  async getIssuesByAssignee() {
    return this.jiraService.getIssuesByAssignee();
  }

  @Post('link-to-team')
  @UseGuards(JwtAuthGuard)
  async linkToTeam(@Body() body: { teamId?: string }) {
    const config = await this.jiraService.getConfig();
    const projectKey = config?.projectKey || 'BO';
    await this.jiraService.linkSyncedItemsToTeam(projectKey, body.teamId);
    return { success: true };
  }

  @Get('epics')
  @UseGuards(JwtAuthGuard)
  async getEpics() {
    return this.jiraService.getEpics();
  }
}
