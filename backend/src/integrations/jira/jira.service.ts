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
      authType: cfg?.authType || 'oauth',
      lastSyncAt: config.lastSyncAt,
      connectedSite: cfg?.siteName || cfg?.cloudId || null,
      connectedUser: cfg?.connectedUser || null,
      projectKey: cfg?.projectKey || null,
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

  async connectWithApiToken(baseUrl: string, email: string, apiToken: string): Promise<{ success: boolean; siteName: string }> {
    // Validate by calling Jira REST API with basic auth
    const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
    const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');

    this.logger.log(`Testing API token connection to ${cleanBaseUrl}...`);

    const response = await fetch(`${cleanBaseUrl}/rest/api/3/myself`, {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`API token validation failed: ${response.status} - ${errorText}`);
      throw new BadRequestException(
        response.status === 401
          ? 'Invalid email or API token. Check your credentials.'
          : `Jira connection failed (${response.status}). Check your Base URL.`,
      );
    }

    const user = await response.json();
    this.logger.log(`API token validated. Connected as: ${user.displayName} (${user.emailAddress})`);

    // Extract site name from base URL
    const siteName = new URL(cleanBaseUrl).hostname.replace('.atlassian.net', '');

    const configData = {
      authType: 'api-token',
      baseUrl: cleanBaseUrl,
      email,
      apiToken,
      siteName,
      connectedUser: user.displayName,
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

    return { success: true, siteName: `${siteName} (${user.displayName})` };
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

  /** Build auth headers for Jira API calls based on stored config */
  private async getAuthHeaders(): Promise<{ headers: Record<string, string>; baseUrl: string; config: any } | null> {
    const config = await this.prisma.integrationConfig.findFirst({
      where: { type: 'jira', isActive: true },
    });
    if (!config) return null;

    const cfg = config.config as any;

    if (cfg.authType === 'api-token' && cfg.baseUrl && cfg.email && cfg.apiToken) {
      const auth = Buffer.from(`${cfg.email}:${cfg.apiToken}`).toString('base64');
      return {
        baseUrl: cfg.baseUrl,
        headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
        config: cfg,
      };
    }

    if (cfg.accessToken) {
      const baseUrl = cfg.baseUrl || `https://api.atlassian.com/ex/jira/${cfg.cloudId}`;
      return {
        baseUrl,
        headers: { Authorization: `Bearer ${cfg.accessToken}`, Accept: 'application/json' },
        config: cfg,
      };
    }

    return null;
  }

  /** Get available Jira projects for configuration */
  async getProjects() {
    const auth = await this.getAuthHeaders();
    if (!auth) return [];

    try {
      const res = await fetch(`${auth.baseUrl}/rest/api/3/project/search?maxResults=50`, { headers: auth.headers });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.values || []).map((p: any) => ({
        key: p.key,
        name: p.name,
        id: p.id,
        avatarUrl: p.avatarUrls?.['24x24'] || null,
      }));
    } catch (err: any) {
      this.logger.error(`Failed to fetch Jira projects: ${err.message}`);
      return [];
    }
  }

  /** Get available Jira custom fields (for field mapping) */
  async getFields(): Promise<Array<{ id: string; name: string; custom: boolean }>> {
    const auth = await this.getAuthHeaders();
    if (!auth) throw new BadRequestException('Jira is not connected');
    try {
      const res = await fetch(`${auth.baseUrl}/rest/api/3/field`, { headers: auth.headers });
      if (!res.ok) {
        this.logger.error(`Failed to fetch Jira fields: ${res.status}`);
        throw new BadRequestException(`Jira API error: ${res.status}`);
      }
      const data = await res.json();
      return (Array.isArray(data) ? data : []).map((f: any) => ({
        id: f.id,
        name: f.name,
        custom: !!f.custom,
      }));
    } catch (err: any) {
      this.logger.error(`Failed to fetch Jira fields: ${err.message}`);
      throw new BadRequestException(`Jira API error: ${err.message}`);
    }
  }

  /** Get the persisted field mapping (with defaults) */
  async getFieldMapping(): Promise<Record<string, string>> {
    const config = await this.prisma.integrationConfig.findFirst({ where: { type: 'jira' } });
    const cfg = (config?.config as any) || {};
    const mapping = cfg.fieldMapping || {};
    return {
      storyPoints: mapping.storyPoints || 'customfield_10034',
      sprint: mapping.sprint || 'customfield_10020',
      epicLink: mapping.epicLink || 'customfield_10014',
      tShirtSize: mapping.tShirtSize || '',
      quarter: mapping.quarter || '',
    };
  }

  /** Update the field mapping */
  async updateFieldMapping(mapping: Record<string, string>) {
    const existing = await this.prisma.integrationConfig.findFirst({ where: { type: 'jira' } });
    if (!existing) throw new BadRequestException('Jira is not connected');
    const cfg = (existing.config as any) || {};
    cfg.fieldMapping = {
      ...(cfg.fieldMapping || {}),
      ...mapping,
    };
    await this.prisma.integrationConfig.update({
      where: { id: existing.id },
      data: { config: cfg as any },
    });
    return { success: true, fieldMapping: cfg.fieldMapping };
  }

  /** Save the selected project key to sync */
  async setProject(projectKey: string) {
    const existing = await this.prisma.integrationConfig.findFirst({ where: { type: 'jira' } });
    if (!existing) throw new BadRequestException('Jira is not connected');
    const cfg = existing.config as any;
    cfg.projectKey = projectKey;
    await this.prisma.integrationConfig.update({
      where: { id: existing.id },
      data: { config: cfg as any },
    });
    return { success: true, projectKey };
  }

  /** Get sync settings from config */
  async getSyncSettings(): Promise<{ jqlFilter: string; maxIssues: number }> {
    const config = await this.prisma.integrationConfig.findFirst({ where: { type: 'jira' } });
    const cfg = config?.config as any;
    return {
      jqlFilter: cfg?.syncJql || '',
      maxIssues: cfg?.maxIssues || 2000,
    };
  }

  /** Update sync settings */
  async updateSyncSettings(settings: { jqlFilter?: string; maxIssues?: number }) {
    const existing = await this.prisma.integrationConfig.findFirst({ where: { type: 'jira' } });
    if (!existing) throw new BadRequestException('Jira is not connected');
    const cfg = (existing.config as any) || {};
    if (settings.jqlFilter !== undefined) cfg.syncJql = settings.jqlFilter;
    if (settings.maxIssues !== undefined) cfg.maxIssues = Math.min(Math.max(settings.maxIssues, 50), 10000);
    await this.prisma.integrationConfig.update({
      where: { id: existing.id },
      data: { config: cfg as any },
    });
    return { success: true };
  }

  /** Sync issues from Jira into local WorkItem table */
  async syncIssues(): Promise<{ synced: number; errors: number }> {
    const auth = await this.getAuthHeaders();
    if (!auth) throw new BadRequestException('Jira is not connected');

    const projectKey = auth.config.projectKey;
    const cfg = auth.config;
    const fieldMap = await this.getFieldMapping();
    const fSP = fieldMap.storyPoints;
    const fSprint = fieldMap.sprint;
    const fEpicLink = fieldMap.epicLink;
    const fTShirt = fieldMap.tShirtSize;
    const fQuarter = fieldMap.quarter;

    // Build JQL: use custom syncJql if set, otherwise default with board sprint scoping
    let jql: string;
    if (cfg.syncJql) {
      jql = cfg.syncJql;
    } else if (projectKey) {
      // Include sprint-associated issues + ALL epics (epics typically have no sprint) + recent updates
      jql = `project = "${projectKey}" AND (sprint is not EMPTY OR issuetype = Epic) AND updated >= -104w ORDER BY updated DESC`;
    } else {
      jql = 'updated >= -104w ORDER BY updated DESC';
    }

    const maxIssuesLimit = cfg.maxIssues || 5000;
    const pageSize = 100;
    let nextPageToken: string | null = null;
    let synced = 0;
    let errors = 0;
    let totalFetched = 0;

    this.logger.log(`Starting Jira sync. JQL: ${jql}, maxIssues: ${maxIssuesLimit}`);

    // Clear previous synced data to ensure fresh state
    const deleted = await this.prisma.workItem.deleteMany({ where: { source: 'jira' } });
    this.logger.log(`Cleared ${deleted.count} previous Jira items`);

    do {
      const baseFields = ['summary','status','priority','assignee','issuetype','fixVersions','created','updated', fSP, fSprint, fEpicLink];
      if (fTShirt) baseFields.push(fTShirt);
      if (fQuarter) baseFields.push(fQuarter);
      const fields = baseFields.filter(Boolean).join(',');
      const params = new URLSearchParams({ jql, fields, maxResults: pageSize.toString() });
      if (nextPageToken) params.set('nextPageToken', nextPageToken);

      const url = `${auth.baseUrl}/rest/api/3/search/jql?${params.toString()}`;

      const response = await fetch(url, { headers: auth.headers });
      if (!response.ok) {
        const errText = await response.text();
        this.logger.error(`Jira sync failed: ${response.status} - ${errText}`);
        throw new BadRequestException(`Jira API error: ${response.status}`);
      }

      const data = await response.json();
      const issues = data.issues || [];
      nextPageToken = data.nextPageToken || null;
      totalFetched += issues.length;

      // Batch upsert: process issues in a single transaction per page
      const upsertOps = issues.map((issue: any) => {
        try {
          const assigneeName = issue.fields?.assignee?.displayName || null;
          const assigneeEmail = issue.fields?.assignee?.emailAddress || null;
          const baseUrl = auth.baseUrl.replace('/rest/api/3', '').replace(/\/+$/, '');
          const browseUrl = `${cfg.baseUrl || baseUrl}/browse/${issue.key}`;

          const itemData = {
            title: issue.fields?.summary || issue.key,
            status: this.mapJiraStatus(issue.fields?.status?.name),
            priority: this.mapJiraPriority(issue.fields?.priority?.name),
            type: issue.fields?.issuetype?.name || null,
            assignee: assigneeName,
            assigneeEmail: assigneeEmail,
            storyPoints: issue.fields?.[fSP] ?? null,
            sprint: this.extractSprintName(issue.fields, fSprint),
            fixVersion: issue.fields?.fixVersions?.[0]?.name || null,
            externalUrl: browseUrl,
            epicKey: issue.fields?.[fEpicLink] || null,
            tShirtSize: fTShirt ? this.normalizeTShirt(issue.fields?.[fTShirt]) : null,
            quarter: fQuarter ? this.normalizeQuarter(issue.fields?.[fQuarter]) : null,
            createdAt: issue.fields?.created ? new Date(issue.fields.created) : new Date(),
            updatedAt: issue.fields?.updated ? new Date(issue.fields.updated) : new Date(),
          };

          return { key: issue.key, data: itemData };
        } catch (err: any) {
          this.logger.warn(`Failed to parse issue ${issue.key}: ${err.message}`);
          errors++;
          return null;
        }
      }).filter(Boolean) as Array<{ key: string; data: any }>;

      // Batch upsert using raw SQL for performance (50x faster than individual upserts)
      if (upsertOps.length > 0) {
        try {
          await this.prisma.$transaction(async (tx) => {
            for (const op of upsertOps) {
              await tx.workItem.upsert({
                where: { source_externalId: { source: 'jira', externalId: op.key } },
                update: op.data,
                create: { ...op.data, source: 'jira', externalId: op.key },
              });
            }
          }, { timeout: 60000 });
          synced += upsertOps.length;
        } catch (err: any) {
          this.logger.warn(`Batch upsert failed, falling back to individual: ${err.message}`);
          // Fallback: individual upserts
          for (const op of upsertOps) {
            try {
              await this.prisma.workItem.upsert({
                where: { source_externalId: { source: 'jira', externalId: op.key } },
                update: op.data,
                create: { ...op.data, source: 'jira', externalId: op.key },
              });
              synced++;
            } catch (e: any) {
              this.logger.warn(`Failed to upsert ${op.key}: ${e.message}`);
              errors++;
            }
          }
        }
      }

      this.logger.log(`Sync progress: ${totalFetched} fetched, ${synced} synced`);

      // Enforce max issues limit
      if (totalFetched >= maxIssuesLimit) {
        this.logger.log(`Reached maxIssues limit (${maxIssuesLimit}), stopping sync`);
        break;
      }
    } while (nextPageToken);

    // Update lastSyncAt
    const existing = await this.prisma.integrationConfig.findFirst({ where: { type: 'jira' } });
    if (existing) {
      await this.prisma.integrationConfig.update({
        where: { id: existing.id },
        data: { lastSyncAt: new Date() },
      });
    }

    this.logger.log(`Jira sync complete: ${synced} synced, ${errors} errors (fetched ${totalFetched})`);

    // Auto-link synced items to a team matching the project
    if (projectKey) {
      await this.linkSyncedItemsToTeam(projectKey);
      await this.syncTeamMembersFromAssignees(projectKey);
      await this.syncReleases(projectKey, auth);
    }

    return { synced, errors };
  }

  /** Sync releases (versions) from Jira project */
  private async syncReleases(projectKey: string, auth: { headers: Record<string, string>; baseUrl: string; config: any }) {
    try {
      const url = `${auth.baseUrl}/rest/api/3/project/${projectKey}/versions`;
      const res = await fetch(url, { headers: auth.headers });
      if (!res.ok) {
        this.logger.warn(`Failed to fetch versions: ${res.status}`);
        return;
      }
      const versions = await res.json();
      this.logger.log(`Fetched ${versions.length} versions from Jira project ${projectKey}`);

      for (const v of versions) {
        const status = v.released ? 'released' : v.archived ? 'archived' : 'unreleased';
        await this.prisma.release.upsert({
          where: { projectKey_name: { projectKey, name: v.name } },
          update: {
            status,
            startDate: v.startDate ? new Date(v.startDate) : null,
            releaseDate: v.releaseDate ? new Date(v.releaseDate) : null,
            description: v.description || null,
            externalId: v.id?.toString() || null,
          },
          create: {
            name: v.name,
            projectKey,
            status,
            startDate: v.startDate ? new Date(v.startDate) : null,
            releaseDate: v.releaseDate ? new Date(v.releaseDate) : null,
            description: v.description || null,
            externalId: v.id?.toString() || null,
          },
        });
      }
      this.logger.log(`Synced ${versions.length} releases for ${projectKey}`);
    } catch (err: any) {
      this.logger.warn(`Failed to sync releases: ${err.message}`);
    }
  }

  /** Sync team members by creating User + TeamMember records from Jira assignees */
  async syncTeamMembersFromAssignees(projectKey: string) {
    // Find the team for this project
    const team = await this.prisma.team.findFirst({
      where: { name: { contains: projectKey, mode: 'insensitive' } },
    });
    if (!team) return;

    // Get unique assignees from synced items (active in last 180 days)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 180);

    const assignees = await this.prisma.workItem.findMany({
      where: {
        source: 'jira',
        teamId: team.id,
        assignee: { not: '' },
        updatedAt: { gte: cutoffDate },
      },
      select: { assignee: true, assigneeEmail: true },
      distinct: ['assignee'],
    });

    let created = 0;
    for (const a of assignees) {
      if (!a.assignee) continue;

      // Create or find user by email (or by name if no email)
      const email = a.assigneeEmail || `${a.assignee.toLowerCase().replace(/[^a-z0-9]/g, '.')}@jira.synced`;
      let user = await this.prisma.user.findUnique({ where: { email } });
      if (!user) {
        user = await this.prisma.user.create({
          data: {
            email,
            name: a.assignee,
            passwordHash: '', // non-login account
            role: 'member',
          },
        });
      }

      // Create TeamMember if not exists
      const existing = await this.prisma.teamMember.findUnique({
        where: { userId_teamId: { userId: user.id, teamId: team.id } },
      });
      if (!existing) {
        await this.prisma.teamMember.create({
          data: { userId: user.id, teamId: team.id, role: 'engineer', weeklyCapacity: 40 },
        });
        created++;
      }
    }

    this.logger.log(`Synced team members: ${created} new members added to "${team.name}" (${assignees.length} total assignees)`);
  }

  /** Link synced Jira items to a team. Creates the team if it doesn't exist. */
  async linkSyncedItemsToTeam(projectKey: string, teamId?: string) {
    let team: any;

    if (teamId) {
      team = await this.prisma.team.findUnique({ where: { id: teamId } });
    } else {
      // Find or create a team named after the Jira project
      team = await this.prisma.team.findFirst({
        where: { name: { contains: projectKey, mode: 'insensitive' } },
      });
      if (!team) {
        team = await this.prisma.team.create({
          data: { name: `${projectKey} Team`, color: '#6366f1' },
        });
        this.logger.log(`Created team "${team.name}" for project ${projectKey}`);
      }
    }

    if (!team) return;

    // Link all jira items without a team to this team
    const result = await this.prisma.workItem.updateMany({
      where: { source: 'jira', teamId: null },
      data: { teamId: team.id },
    });
    this.logger.log(`Linked ${result.count} synced items to team "${team.name}"`);
  }

  /** Get issues from local DB (synced from Jira or manually created) */
  async getIssues(filters?: { assignee?: string; status?: string; sprint?: string }) {
    const where: any = { source: 'jira' };
    if (filters?.assignee) where.assignee = { contains: filters.assignee, mode: 'insensitive' };
    if (filters?.status) where.status = filters.status;
    if (filters?.sprint) where.sprint = { contains: filters.sprint, mode: 'insensitive' };

    const items = await this.prisma.workItem.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });

    // If no synced items exist, return empty array
    if (items.length === 0) return [];

    return items.map(item => ({
      key: item.externalId || item.id,
      summary: item.title,
      status: item.status,
      priority: item.priority,
      assignee: item.assignee,
      assigneeEmail: (item as any).assigneeEmail,
      storyPoints: item.storyPoints,
      type: (item as any).type || 'Task',
      sprint: (item as any).sprint,
      externalUrl: (item as any).externalUrl,
    }));
  }

  /** Get issues grouped by assignee */
  async getIssuesByAssignee() {
    const items = await this.prisma.workItem.findMany({
      where: { source: 'jira', assignee: { not: '' } },
      orderBy: { assignee: 'asc' },
    });

    if (items.length === 0) return {};

    const grouped: Record<string, any[]> = {};
    for (const item of items) {
      const name = item.assignee || 'Unassigned';
      if (!grouped[name]) grouped[name] = [];
      grouped[name].push({
        key: item.externalId || item.id,
        summary: item.title,
        status: item.status,
        priority: item.priority,
        storyPoints: item.storyPoints,
        type: (item as any).type,
        sprint: (item as any).sprint,
        externalUrl: (item as any).externalUrl,
      });
    }
    return grouped;
  }

  async getEpics() {
    const items = await this.prisma.workItem.findMany({
      where: { source: 'jira', type: 'Epic' },
      orderBy: { updatedAt: 'desc' },
    });

    if (items.length === 0) return [];

    return items.map(item => ({
      key: item.externalId || item.id,
      summary: item.title,
      status: item.status,
      issueCount: null,
    }));
  }

  private mapJiraStatus(jiraStatus: string | null): string {
    if (!jiraStatus) return 'todo';
    const lower = jiraStatus.toLowerCase();
    if (lower.includes('done') || lower.includes('closed') || lower.includes('resolved')) return 'done';
    if (lower.includes('progress') || lower.includes('active')) return 'in_progress';
    if (lower.includes('review') || lower.includes('testing')) return 'in_review';
    return 'todo';
  }

  private mapJiraPriority(jiraPriority: string | null): string {
    if (!jiraPriority) return 'P3';
    const lower = jiraPriority.toLowerCase();
    if (lower.includes('highest') || lower.includes('critical') || lower.includes('blocker')) return 'P1';
    if (lower.includes('high')) return 'P1';
    if (lower.includes('medium')) return 'P2';
    return 'P3';
  }

  /** Extract sprint name from customfield_10020 (Jira Cloud sprint array) */
  private extractSprintName(fields: any, sprintFieldId: string = 'customfield_10020'): string | null {
    const sprintField = fields?.[sprintFieldId];
    if (Array.isArray(sprintField) && sprintField.length > 0) {
      // Get the most recent/active sprint (last in array)
      const activeSprint = sprintField.find((s: any) => s.state === 'active') || sprintField[sprintField.length - 1];
      return activeSprint?.name || null;
    }
    // Fallback: try direct sprint field
    if (fields?.sprint?.name) return fields.sprint.name;
    return null;
  }

  /** Normalize t-shirt size value from Jira to canonical XS/S/M/L/XL/XXL */
  private normalizeTShirt(raw: any): string | null {
    if (raw == null) return null;
    let v: string | null = null;
    if (typeof raw === 'string') v = raw;
    else if (typeof raw === 'object') v = raw.value || raw.name || raw.label || null;
    if (!v) return null;
    const upper = v.trim().toUpperCase();
    // Accept common variants
    if (['XS','EXTRA SMALL','EXTRASMALL'].includes(upper)) return 'XS';
    if (['S','SMALL'].includes(upper)) return 'S';
    if (['M','MEDIUM'].includes(upper)) return 'M';
    if (['L','LARGE'].includes(upper)) return 'L';
    if (['XL','EXTRA LARGE','EXTRALARGE'].includes(upper)) return 'XL';
    if (['XXL','XX-LARGE','XXLARGE','EXTRA EXTRA LARGE'].includes(upper)) return 'XXL';
    return upper;
  }

  /** Normalize quarter value from Jira (custom field can be string, option, array) */
  private normalizeQuarter(raw: any): string | null {
    if (raw == null) return null;
    if (typeof raw === 'string') return raw.trim() || null;
    if (Array.isArray(raw) && raw.length > 0) {
      const first = raw[0];
      if (typeof first === 'string') return first.trim() || null;
      return first?.value || first?.name || first?.label || null;
    }
    if (typeof raw === 'object') return raw.value || raw.name || raw.label || null;
    return null;
  }
}
