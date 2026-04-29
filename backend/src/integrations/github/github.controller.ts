import { Controller, Get, Post, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { GithubService } from './github.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@Controller('integrations/github')
export class GithubController {
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

  // No auth guard — called by GitHub's OAuth redirect
  @Get('callback')
  async handleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const redirectUrl = await this.githubService.handleCallback(code, state);
    return res.redirect(redirectUrl);
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
