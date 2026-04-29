import { Controller, Get, Logger, Post, Body, Query, Res, UseGuards, BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import { GithubService } from './github.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@Controller('integrations/github')
export class GithubController {
  private readonly logger = new Logger(GithubController.name);

  constructor(private githubService: GithubService) {}

  @Get('config')
  @UseGuards(JwtAuthGuard)
  async getConfig() {
    return this.githubService.getConfig();
  }

  @Get('auth-url')
  @UseGuards(JwtAuthGuard)
  getAuthUrl() {
    return this.githubService.getAuthUrl();
  }

  @Post('connect-token')
  @UseGuards(JwtAuthGuard)
  async connectWithToken(@Body() body: { token: string }) {
    if (!body.token) {
      throw new BadRequestException('Token is required');
    }
    return this.githubService.connectWithToken(body.token);
  }

  // No auth guard — called by GitHub's OAuth redirect
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
      this.logger.warn(`GitHub OAuth denied: ${error} - ${errorDescription}`);
      return res.redirect(`${appUrl}/integrations?error=${encodeURIComponent(errorDescription || error)}`);
    }

    try {
      const redirectUrl = await this.githubService.handleCallback(code, state);
      return res.redirect(redirectUrl);
    } catch (err: any) {
      this.logger.error(`GitHub OAuth callback failed: ${err.message}`, err.stack);
      return res.redirect(`${appUrl}/integrations?error=${encodeURIComponent(err.message || 'OAuth callback failed')}`);
    }
  }

  @Post('disconnect')
  @UseGuards(JwtAuthGuard)
  async disconnect() {
    return this.githubService.disconnect();
  }

  @Get('pulls')
  @UseGuards(JwtAuthGuard)
  async getPullRequests() {
    return this.githubService.getPullRequests();
  }

  @Get('repos')
  @UseGuards(JwtAuthGuard)
  async getRepositories() {
    return this.githubService.getRepositories();
  }
}
