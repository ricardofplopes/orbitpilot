import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class GithubService {
  private readonly logger = new Logger(GithubService.name);

  constructor(private prisma: PrismaService) {}

  private get clientId() { return process.env.GITHUB_CLIENT_ID; }
  private get clientSecret() { return process.env.GITHUB_CLIENT_SECRET; }
  private get appUrl() { return process.env.APP_URL || 'http://localhost:3200'; }
  private get jwtSecret() { return process.env.JWT_SECRET || ''; }
  private get isOAuthConfigured() { return !!(this.clientId && this.clientSecret); }

  private createState(): string {
    const nonce = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now().toString();
    const payload = `${nonce}.${timestamp}`;
    const signature = crypto.createHmac('sha256', this.jwtSecret).update(payload).digest('hex');
    return `${payload}.${signature}`;
  }

  private verifyState(state: string): boolean {
    const parts = state.split('.');
    if (parts.length !== 3) return false;
    const [nonce, timestamp, signature] = parts;
    const expectedSig = crypto.createHmac('sha256', this.jwtSecret).update(`${nonce}.${timestamp}`).digest('hex');
    if (signature !== expectedSig) return false;
    const age = Date.now() - parseInt(timestamp, 10);
    return age < 10 * 60 * 1000;
  }

  async getConfig() {
    const config = await this.prisma.integrationConfig.findFirst({
      where: { type: 'github' },
    });
    if (!config) return { isActive: false, isOAuthConfigured: this.isOAuthConfigured };
    const cfg = config.config as any;
    return {
      id: config.id,
      type: config.type,
      isActive: config.isActive,
      isOAuthConfigured: this.isOAuthConfigured,
      authType: cfg?.authType || 'oauth',
      lastSyncAt: config.lastSyncAt,
      connectedAccount: cfg?.login || cfg?.org || null,
      avatarUrl: cfg?.avatarUrl || null,
    };
  }

  getAuthUrl(): { url: string } {
    if (!this.isOAuthConfigured) {
      throw new BadRequestException('GitHub OAuth is not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET environment variables.');
    }
    const state = this.createState();
    const params = new URLSearchParams({
      client_id: this.clientId!,
      redirect_uri: `${this.appUrl}/api/integrations/github/callback`,
      scope: 'read:org repo',
      state,
    });
    return { url: `https://github.com/login/oauth/authorize?${params}` };
  }

  async handleCallback(code: string, state: string): Promise<string> {
    if (!this.isOAuthConfigured) {
      throw new BadRequestException('GitHub OAuth is not configured.');
    }
    if (!state || !this.verifyState(state)) {
      throw new BadRequestException('Invalid or expired state parameter.');
    }

    // Exchange code for access token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
      }),
    });
    const tokenData = await tokenRes.json();
    if (tokenData.error) {
      throw new BadRequestException(`GitHub OAuth error: ${tokenData.error_description || tokenData.error}`);
    }

    // Fetch user info
    const userRes = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userData = await userRes.json();

    // Store in DB
    const configData = {
      accessToken: tokenData.access_token,
      tokenType: tokenData.token_type,
      scope: tokenData.scope,
      login: userData.login,
      avatarUrl: userData.avatar_url,
    };

    const existing = await this.prisma.integrationConfig.findFirst({ where: { type: 'github' } });
    if (existing) {
      await this.prisma.integrationConfig.update({
        where: { id: existing.id },
        data: { config: configData as any, isActive: true, lastSyncAt: new Date() },
      });
    } else {
      await this.prisma.integrationConfig.create({
        data: { type: 'github', config: configData as any, isActive: true, lastSyncAt: new Date() },
      });
    }

    return `${this.appUrl}/integrations?connected=github`;
  }

  async connectWithToken(token: string): Promise<{ success: boolean; login: string }> {
    // Validate the token by calling GitHub API
    const res = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
      },
    });

    if (!res.ok) {
      throw new BadRequestException('Invalid GitHub token. Check your personal access token.');
    }

    const userData = await res.json();

    const configData = {
      accessToken: token,
      tokenType: 'bearer',
      authType: 'pat',
      scope: 'manual',
      login: userData.login,
      avatarUrl: userData.avatar_url,
    };

    const existing = await this.prisma.integrationConfig.findFirst({ where: { type: 'github' } });
    if (existing) {
      await this.prisma.integrationConfig.update({
        where: { id: existing.id },
        data: { config: configData as any, isActive: true, lastSyncAt: new Date() },
      });
    } else {
      await this.prisma.integrationConfig.create({
        data: { type: 'github', config: configData as any, isActive: true, lastSyncAt: new Date() },
      });
    }

    return { success: true, login: userData.login };
  }

  async disconnect() {
    const existing = await this.prisma.integrationConfig.findFirst({ where: { type: 'github' } });
    if (existing) {
      await this.prisma.integrationConfig.update({
        where: { id: existing.id },
        data: { config: {} as any, isActive: false, lastSyncAt: null },
      });
    }
    return { success: true };
  }

  /** Get stored GitHub token if connection is active */
  private async getToken(): Promise<string | null> {
    const config = await this.prisma.integrationConfig.findFirst({
      where: { type: 'github', isActive: true },
    });
    if (!config) return null;
    const cfg = config.config as any;
    return cfg?.accessToken || null;
  }

  async getPullRequests() {
    const token = await this.getToken();
    if (!token) return this.getMockPullRequests();

    try {
      // Get authenticated user's repos then recent PRs
      const userRes = await fetch('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
      });
      if (!userRes.ok) return this.getMockPullRequests();
      const user = await userRes.json();

      // Search for recent PRs involving the user
      const query = encodeURIComponent(`is:pr author:${user.login} sort:updated-desc`);
      const searchRes = await fetch(`https://api.github.com/search/issues?q=${query}&per_page=20`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
      });
      if (!searchRes.ok) return this.getMockPullRequests();

      const searchData = await searchRes.json();
      return (searchData.items || []).map((pr: any) => ({
        number: pr.number,
        title: pr.title,
        state: pr.pull_request?.merged_at ? 'merged' : pr.state,
        author: pr.user?.login || '',
        createdAt: pr.created_at,
        updatedAt: pr.updated_at,
        reviewers: (pr.assignees || []).map((a: any) => a.login),
        additions: null,
        deletions: null,
        repository: pr.repository_url?.split('/').pop() || '',
        htmlUrl: pr.html_url,
      }));
    } catch (err: any) {
      this.logger.error(`Failed to fetch GitHub PRs: ${err.message}`);
      return this.getMockPullRequests();
    }
  }

  async getRepositories() {
    const token = await this.getToken();
    if (!token) return this.getMockRepositories();

    try {
      const res = await fetch('https://api.github.com/user/repos?sort=updated&per_page=30', {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
      });
      if (!res.ok) return this.getMockRepositories();

      const repos = await res.json();
      return repos.map((repo: any) => ({
        name: repo.name,
        fullName: repo.full_name,
        language: repo.language,
        openPRs: repo.open_issues_count,
        stars: repo.stargazers_count,
        lastPush: repo.pushed_at,
        htmlUrl: repo.html_url,
        private: repo.private,
      }));
    } catch (err: any) {
      this.logger.error(`Failed to fetch GitHub repos: ${err.message}`);
      return this.getMockRepositories();
    }
  }

  private getMockPullRequests() {
    return [
      { number: 42, title: 'feat: Add checkout flow v2', state: 'open', author: 'alice-chen', createdAt: '2026-07-15T10:00:00Z', updatedAt: '2026-07-16T14:30:00Z', reviewers: ['bob-smith', 'carol-davis'], additions: 342, deletions: 89, repository: 'frontend' },
      { number: 43, title: 'fix: Payment timeout handling', state: 'open', author: 'bob-smith', createdAt: '2026-07-16T09:00:00Z', updatedAt: '2026-07-16T11:00:00Z', reviewers: ['david-park'], additions: 56, deletions: 12, repository: 'payment-service' },
      { number: 41, title: 'chore: Update dependencies', state: 'merged', author: 'carol-davis', createdAt: '2026-07-14T08:00:00Z', updatedAt: '2026-07-15T09:00:00Z', reviewers: ['alice-chen'], additions: 120, deletions: 95, repository: 'backend' },
      { number: 38, title: 'feat: Data pipeline retry logic', state: 'merged', author: 'david-park', createdAt: '2026-07-12T14:00:00Z', updatedAt: '2026-07-13T16:00:00Z', reviewers: ['eva-martinez', 'alice-chen'], additions: 210, deletions: 45, repository: 'data-pipeline' },
    ];
  }

  private getMockRepositories() {
    return [
      { name: 'frontend', language: 'TypeScript', openPRs: 3, stars: 12, lastPush: '2026-07-16T14:30:00Z' },
      { name: 'backend', language: 'TypeScript', openPRs: 1, stars: 8, lastPush: '2026-07-15T09:00:00Z' },
      { name: 'payment-service', language: 'Go', openPRs: 2, stars: 5, lastPush: '2026-07-16T11:00:00Z' },
      { name: 'data-pipeline', language: 'Python', openPRs: 0, stars: 3, lastPush: '2026-07-13T16:00:00Z' },
      { name: 'mobile-app', language: 'Kotlin', openPRs: 4, stars: 6, lastPush: '2026-07-16T08:00:00Z' },
    ];
  }
}
