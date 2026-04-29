import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class JiraService {
  private readonly logger = new Logger(JiraService.name);

  constructor(private prisma: PrismaService) {}

  private get clientId() { return process.env.JIRA_CLIENT_ID; }
  private get clientSecret() { return process.env.JIRA_CLIENT_SECRET; }
  private get appUrl() { return process.env.APP_URL || 'http://localhost:3200'; }
  private get jwtSecret() { return process.env.JWT_SECRET || ''; }
  private get isOAuthConfigured() { return !!(this.clientId && this.clientSecret); }

  /** Create a signed state token that can be verified without storage */
  private createState(): string {
    const nonce = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now().toString();
    const payload = `${nonce}.${timestamp}`;
    const signature = crypto.createHmac('sha256', this.jwtSecret).update(payload).digest('hex');
    return `${payload}.${signature}`;
  }

  /** Verify a signed state token (valid for 10 minutes) */
  private verifyState(state: string): boolean {
    const parts = state.split('.');
    if (parts.length !== 3) return false;
    const [nonce, timestamp, signature] = parts;
    const expectedSig = crypto.createHmac('sha256', this.jwtSecret).update(`${nonce}.${timestamp}`).digest('hex');
    if (signature !== expectedSig) return false;
    const age = Date.now() - parseInt(timestamp, 10);
    return age < 10 * 60 * 1000; // 10 minute expiry
  }

  async getConfig() {
    const config = await this.prisma.integrationConfig.findFirst({
      where: { type: 'jira' },
    });
    if (!config) return { isActive: false, isOAuthConfigured: this.isOAuthConfigured };
    const cfg = config.config as any;
    return {
      id: config.id,
      type: config.type,
      isActive: config.isActive,
      isOAuthConfigured: this.isOAuthConfigured,
      lastSyncAt: config.lastSyncAt,
      connectedSite: cfg?.siteName || cfg?.cloudId || null,
    };
  }

  getAuthUrl(): { url: string } {
    if (!this.isOAuthConfigured) {
      throw new BadRequestException('Jira OAuth is not configured. Set JIRA_CLIENT_ID and JIRA_CLIENT_SECRET environment variables.');
    }
    const state = this.createState();
    const redirectUri = `${this.appUrl}/api/integrations/jira/callback`;
    const scopes = process.env.JIRA_SCOPES || 'read:jira-work read:jira-user write:jira-work';

    // Build URL manually to ensure proper %20 encoding (not +) for scopes
    const params = new URLSearchParams({
      audience: 'api.atlassian.com',
      client_id: this.clientId!,
      scope: scopes,
      redirect_uri: redirectUri,
      state,
      response_type: 'code',
      prompt: 'consent',
    });
    // URLSearchParams encodes space as '+', but Atlassian expects '%20' in query strings
    const queryString = params.toString().replace(/\+/g, '%20');

    this.logger.log(`Auth URL redirect_uri: ${redirectUri}`);
    this.logger.log(`Auth URL scopes: ${scopes}`);
    return { url: `https://auth.atlassian.com/authorize?${queryString}` };
  }

  async handleCallback(code: string, state: string): Promise<string> {
    if (!this.isOAuthConfigured) {
      throw new BadRequestException('Jira OAuth is not configured.');
    }
    if (!state || !this.verifyState(state)) {
      throw new BadRequestException('Invalid or expired state parameter.');
    }
    if (!code) {
      throw new BadRequestException('No authorization code received from Atlassian.');
    }

    const redirectUri = `${this.appUrl}/api/integrations/jira/callback`;
    this.logger.log(`Exchanging authorization code for tokens...`);
    this.logger.log(`Token exchange redirect_uri: ${redirectUri}`);
    this.logger.log(`Code received: length=${code.length}, value=${code}`);

    // Exchange code for tokens using JSON (per Atlassian OAuth 2.0 3LO docs)
    const requestBody = {
      grant_type: 'authorization_code',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code,
      redirect_uri: redirectUri,
    };
    this.logger.log(`Token request body (without secret): ${JSON.stringify({ ...requestBody, client_secret: '***' })}`);

    const tokenRes = await fetch('https://auth.atlassian.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
    const tokenData = await tokenRes.json();
    this.logger.log(`Token response status: ${tokenRes.status}`);

    if (tokenData.error) {
      this.logger.error(`Token exchange failed: ${JSON.stringify(tokenData)}`);
      const hint = tokenData.error_description?.includes('authorization_code')
        ? '. Ensure your Atlassian app has Jira API scopes configured in the Permissions tab'
        : '';
      throw new BadRequestException(`Jira OAuth error: ${tokenData.error_description || tokenData.error}${hint}`);
    }

    this.logger.log('Token exchange successful, fetching accessible resources...');

    // Get accessible resources (cloud sites)
    const resourcesRes = await fetch('https://api.atlassian.com/oauth/token/accessible-resources', {
      headers: { Authorization: `Bearer ${tokenData.access_token}`, Accept: 'application/json' },
    });
    const resources = await resourcesRes.json();
    this.logger.log(`Found ${Array.isArray(resources) ? resources.length : 0} accessible site(s)`);
    const site = resources[0]; // Use first available site

    const configData = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
      scope: tokenData.scope,
      cloudId: site?.id || null,
      siteName: site?.name || null,
      siteUrl: site?.url || null,
    };

    const existing = await this.prisma.integrationConfig.findFirst({ where: { type: 'jira' } });
    if (existing) {
      await this.prisma.integrationConfig.update({
        where: { id: existing.id },
        data: { config: configData as any, isActive: true, lastSyncAt: new Date() },
      });
    } else {
      await this.prisma.integrationConfig.create({
        data: { type: 'jira', config: configData as any, isActive: true, lastSyncAt: new Date() },
      });
    }

    return `${this.appUrl}/integrations?connected=jira`;
  }

  async disconnect() {
    const existing = await this.prisma.integrationConfig.findFirst({ where: { type: 'jira' } });
    if (existing) {
      await this.prisma.integrationConfig.update({
        where: { id: existing.id },
        data: { config: {} as any, isActive: false, lastSyncAt: null },
      });
    }
    return { success: true };
  }

  async getIssues() {
    // Mock Jira issues for development
    return [
      {
        key: 'PROJ-101',
        summary: 'Implement checkout flow redesign',
        status: 'In Progress',
        priority: 'High',
        assignee: 'Alice Chen',
        storyPoints: 8,
        type: 'Story',
        sprint: 'Sprint 23',
      },
      {
        key: 'PROJ-102',
        summary: 'Fix payment processing timeout',
        status: 'To Do',
        priority: 'Critical',
        assignee: 'Bob Smith',
        storyPoints: 5,
        type: 'Bug',
        sprint: 'Sprint 23',
      },
      {
        key: 'PROJ-103',
        summary: 'Add unit tests for payment service',
        status: 'Done',
        priority: 'Medium',
        assignee: 'Carol Davis',
        storyPoints: 3,
        type: 'Task',
        sprint: 'Sprint 22',
      },
      {
        key: 'PROJ-104',
        summary: 'Database migration for user profiles',
        status: 'In Review',
        priority: 'High',
        assignee: 'David Park',
        storyPoints: 5,
        type: 'Story',
        sprint: 'Sprint 23',
      },
      {
        key: 'PROJ-105',
        summary: 'API rate limiting implementation',
        status: 'In Progress',
        priority: 'Medium',
        assignee: 'Eva Martinez',
        storyPoints: 8,
        type: 'Story',
        sprint: 'Sprint 23',
      },
      {
        key: 'PROJ-106',
        summary: 'Mobile push notification service',
        status: 'To Do',
        priority: 'Low',
        assignee: null,
        storyPoints: 13,
        type: 'Epic',
        sprint: 'Sprint 24',
      },
    ];
  }

  async getEpics() {
    return [
      { key: 'PROJ-50', summary: 'Checkout Flow Redesign', status: 'In Progress', issueCount: 12 },
      { key: 'PROJ-51', summary: 'Payment Gateway Migration', status: 'To Do', issueCount: 8 },
      { key: 'PROJ-52', summary: 'Mobile App V2', status: 'In Progress', issueCount: 15 },
    ];
  }
}
