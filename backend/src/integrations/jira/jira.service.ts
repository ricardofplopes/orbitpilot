import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class JiraService {
  private pendingStates = new Map<string, { expiresAt: number }>();

  constructor(private prisma: PrismaService) {}

  private get clientId() { return process.env.JIRA_CLIENT_ID; }
  private get clientSecret() { return process.env.JIRA_CLIENT_SECRET; }
  private get appUrl() { return process.env.APP_URL || 'http://localhost:3200'; }
  private get isOAuthConfigured() { return !!(this.clientId && this.clientSecret); }

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
    const state = crypto.randomBytes(20).toString('hex');
    this.pendingStates.set(state, { expiresAt: Date.now() + 10 * 60 * 1000 });
    for (const [k, v] of this.pendingStates) {
      if (v.expiresAt < Date.now()) this.pendingStates.delete(k);
    }
    const params = new URLSearchParams({
      audience: 'api.atlassian.com',
      client_id: this.clientId!,
      scope: 'read:jira-work read:jira-user manage:jira-project offline_access',
      redirect_uri: `${this.appUrl}/api/integrations/jira/callback`,
      state,
      response_type: 'code',
      prompt: 'consent',
    });
    return { url: `https://auth.atlassian.com/authorize?${params}` };
  }

  async handleCallback(code: string, state: string): Promise<string> {
    if (!this.isOAuthConfigured) {
      throw new BadRequestException('Jira OAuth is not configured.');
    }
    const pending = this.pendingStates.get(state);
    if (!pending || pending.expiresAt < Date.now()) {
      this.pendingStates.delete(state);
      throw new BadRequestException('Invalid or expired state parameter.');
    }
    this.pendingStates.delete(state);

    // Exchange code for tokens
    const tokenRes = await fetch('https://auth.atlassian.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: `${this.appUrl}/api/integrations/jira/callback`,
      }),
    });
    const tokenData = await tokenRes.json();
    if (tokenData.error) {
      throw new BadRequestException(`Jira OAuth error: ${tokenData.error_description || tokenData.error}`);
    }

    // Get accessible resources (cloud sites)
    const resourcesRes = await fetch('https://api.atlassian.com/oauth/token/accessible-resources', {
      headers: { Authorization: `Bearer ${tokenData.access_token}`, Accept: 'application/json' },
    });
    const resources = await resourcesRes.json();
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
