import client from './client';
import type {
  User,
  Team,
  TeamMember,
  CapacityPeriod,
  Availability,
  QuarterPlan,
  Initiative,
  WorkItem,
  Insight,
  DashboardData,
  EpicPlan,
  QuarterImpact,
  JiraField,
  JiraFieldMapping,
} from '@/types';

// Auth
export const auth = {
  login: async (email: string, password: string) => {
    const { data } = await client.post<{ access_token: string; user: User }>('/auth/login', { email, password });
    return data;
  },
};

// Users
export const users = {
  getMe: async () => {
    const { data } = await client.get<User>('/users/me');
    return data;
  },
  getAll: async () => {
    const { data } = await client.get<User[]>('/users');
    return data;
  },
};

// Teams
export const teams = {
  getTeams: async () => {
    const { data } = await client.get<Team[]>('/teams');
    return data;
  },
  createTeam: async (payload: Partial<Team>) => {
    const { data } = await client.post<Team>('/teams', payload);
    return data;
  },
  updateTeam: async (id: string, payload: Partial<Team>) => {
    const { data } = await client.put<Team>(`/teams/${id}`, payload);
    return data;
  },
  deleteTeam: async (id: string) => {
    await client.delete(`/teams/${id}`);
  },
  addMember: async (teamId: string, payload: { userId: string; role?: string; weeklyCapacity?: number }) => {
    const { data } = await client.post<TeamMember>(`/teams/${teamId}/members`, payload);
    return data;
  },
  removeMember: async (teamId: string, memberId: string) => {
    await client.delete(`/teams/${teamId}/members/${memberId}`);
  },
  toggleMemberActive: async (teamId: string, memberId: string, isActive: boolean) => {
    const { data } = await client.patch(`/teams/${teamId}/members/${memberId}`, { isActive });
    return data;
  },
};

// Capacity
export const capacity = {
  getSummary: async (start?: string, end?: string) => {
    const params = new URLSearchParams();
    if (start) params.append('start', start);
    if (end) params.append('end', end);
    const { data } = await client.get(`/capacity/summary?${params.toString()}`);
    return data;
  },
  getTeamCapacity: async (teamId: string, start?: string, end?: string) => {
    const params = new URLSearchParams();
    if (start) params.append('start', start);
    if (end) params.append('end', end);
    const { data } = await client.get(`/capacity/team/${teamId}?${params.toString()}`);
    return data;
  },
  getTeamVelocity: async (teamId: string, sprintCount: number = 6) => {
    const { data } = await client.get(`/capacity/team/${teamId}/velocity?sprintCount=${sprintCount}`);
    return data;
  },
  getTeamAvailability: async (teamId: string, start: string, end: string) => {
    const { data } = await client.get(`/capacity/team/${teamId}/availability?start=${start}&end=${end}`);
    return data;
  },
  createPeriod: async (payload: Partial<CapacityPeriod>) => {
    const { data } = await client.post<CapacityPeriod>('/capacity/periods', payload);
    return data;
  },
  setAvailability: async (payload: Partial<Availability>) => {
    const { data } = await client.post<Availability>('/capacity/availability', payload);
    return data;
  },
  deleteAvailability: async (id: string) => {
    const { data } = await client.post(`/capacity/availability/${id}/delete`);
    return data;
  },
};

// Planning
export const planning = {
  getQuarters: async () => {
    const { data } = await client.get<QuarterPlan[]>('/planning/quarters');
    return data;
  },
  createQuarter: async (payload: Partial<QuarterPlan>) => {
    const { data } = await client.post<QuarterPlan>('/planning/quarters', payload);
    return data;
  },
  getQuarter: async (id: string) => {
    const { data } = await client.get<QuarterPlan>(`/planning/quarters/${id}`);
    return data;
  },
  createInitiative: async (quarterId: string, payload: Partial<Initiative>) => {
    const { data } = await client.post<Initiative>(`/planning/quarters/${quarterId}/initiatives`, payload);
    return data;
  },
  updateInitiative: async (id: string, payload: Partial<Initiative>) => {
    const { data } = await client.put<Initiative>(`/planning/initiatives/${id}`, payload);
    return data;
  },
  deleteInitiative: async (id: string) => {
    await client.delete(`/planning/initiatives/${id}`);
  },
  // Epic-based planning
  getEpicQuarters: async () => {
    const { data } = await client.get<string[]>('/planning/epic-quarters');
    return data;
  },
  getEpicsByQuarter: async (quarter: string) => {
    const { data } = await client.get<EpicPlan[]>(`/planning/epic-quarter/${encodeURIComponent(quarter)}/epics`);
    return data;
  },
  getQuarterImpact: async (quarter: string) => {
    const { data } = await client.get<QuarterImpact>(`/planning/epic-quarter/${encodeURIComponent(quarter)}/impact`);
    return data;
  },
};

// Work
export const work = {
  getWorkItems: async (filters?: { teamId?: string; status?: string; source?: string; startDate?: string; endDate?: string; sprints?: string[] }) => {
    const params = new URLSearchParams();
    if (filters?.teamId) params.append('teamId', filters.teamId);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.source) params.append('source', filters.source);
    if (filters?.sprints && filters.sprints.length > 0) {
      params.append('sprints', filters.sprints.join(','));
    } else {
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);
    }
    const { data } = await client.get<WorkItem[]>(`/work?${params.toString()}`);
    return data;
  },
  createWorkItem: async (payload: Partial<WorkItem>) => {
    const { data } = await client.post<WorkItem>('/work', payload);
    return data;
  },
  updateWorkItem: async (id: string, payload: Partial<WorkItem>) => {
    const { data } = await client.put<WorkItem>(`/work/${id}`, payload);
    return data;
  },
  deleteWorkItem: async (id: string) => {
    await client.delete(`/work/${id}`);
  },
  getSummary: async () => {
    const { data } = await client.get('/work/summary');
    return data;
  },
};

// Integrations
export const integrations = {
  getJiraConfig: async () => {
    const { data } = await client.get('/integrations/jira/config');
    return data;
  },
  getJiraAuthUrl: async () => {
    const { data } = await client.get<{ url: string }>('/integrations/jira/auth-url');
    return data;
  },
  connectJiraToken: async (baseUrl: string, email: string, apiToken: string) => {
    const { data } = await client.post<{ success: boolean; siteName: string }>('/integrations/jira/connect-token', { baseUrl, email, apiToken });
    return data;
  },
  disconnectJira: async () => {
    const { data } = await client.post('/integrations/jira/disconnect');
    return data;
  },
  getJiraProjects: async () => {
    const { data } = await client.get<Array<{ key: string; name: string; id: string }>>('/integrations/jira/projects');
    return data;
  },
  setJiraProject: async (projectKey: string) => {
    const { data } = await client.post('/integrations/jira/set-project', { projectKey });
    return data;
  },
  syncJira: async () => {
    const { data } = await client.post<{ synced: number; errors: number }>('/integrations/jira/sync', {}, { timeout: 300000 });
    return data;
  },
  getJiraIssues: async (filters?: { assignee?: string; status?: string; sprint?: string }) => {
    const params = new URLSearchParams();
    if (filters?.assignee) params.set('assignee', filters.assignee);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.sprint) params.set('sprint', filters.sprint);
    const { data } = await client.get(`/integrations/jira/issues?${params.toString()}`);
    return data;
  },
  getJiraIssuesByAssignee: async () => {
    const { data } = await client.get('/integrations/jira/issues-by-assignee');
    return data;
  },
  getJiraEpics: async () => {
    const { data } = await client.get('/integrations/jira/epics');
    return data;
  },
  getJiraSyncSettings: async () => {
    const { data } = await client.get<{ jqlFilter: string; maxIssues: number }>('/integrations/jira/sync-settings');
    return data;
  },
  updateJiraSyncSettings: async (settings: { jqlFilter?: string; maxIssues?: number }) => {
    const { data } = await client.post('/integrations/jira/sync-settings', settings);
    return data;
  },
  getJiraFields: async () => {
    const { data } = await client.get<JiraField[]>('/integrations/jira/fields');
    return data;
  },
  getJiraFieldMapping: async () => {
    const { data } = await client.get<JiraFieldMapping>('/integrations/jira/field-mapping');
    return data;
  },
  updateJiraFieldMapping: async (mapping: JiraFieldMapping) => {
    const { data } = await client.post<{ success: boolean; fieldMapping: JiraFieldMapping }>('/integrations/jira/field-mapping', mapping);
    return data;
  },
  getGithubConfig: async () => {
    const { data } = await client.get('/integrations/github/config');
    return data;
  },
  getGithubAuthUrl: async () => {
    const { data } = await client.get<{ url: string }>('/integrations/github/auth-url');
    return data;
  },
  connectGithubToken: async (token: string) => {
    const { data } = await client.post<{ success: boolean; login: string }>('/integrations/github/connect-token', { token });
    return data;
  },
  disconnectGithub: async () => {
    const { data } = await client.post('/integrations/github/disconnect');
    return data;
  },
};

// Insights
export const insights = {
  getInsights: async () => {
    const { data } = await client.get<Insight[]>('/insights');
    return data;
  },
};

// Dashboard
export const dashboard = {
  getDashboard: async (teamId?: string, startDate?: string, endDate?: string, sprints?: string[]) => {
    const params: any = {};
    if (teamId) params.teamId = teamId;
    if (sprints && sprints.length > 0) params.sprints = sprints.join(',');
    else if (startDate) params.startDate = startDate;
    if (!sprints?.length && endDate) params.endDate = endDate;
    const { data } = await client.get('/dashboard', { params });
    return data;
  },
  getSprints: async (teamId?: string) => {
    const params: any = {};
    if (teamId) params.teamId = teamId;
    const { data } = await client.get<Array<{ name: string; itemCount: number }>>('/dashboard/sprints', { params });
    return data;
  },
};

// App settings (t-shirt size mapping)
export const settings = {
  getTShirtMap: async () => {
    const { data } = await client.get<Record<string, number>>('/settings/tshirt-map');
    return data;
  },
  updateTShirtMap: async (map: Record<string, number>) => {
    const { data } = await client.put<Record<string, number>>('/settings/tshirt-map', map);
    return data;
  },
};

// Reports
export const reports = {
  getOverall: async () => {
    const { data } = await client.get('/reports/overall');
    return data;
  },
  getTeamReport: async (teamId: string) => {
    const { data } = await client.get(`/reports/team/${teamId}`);
    return data;
  },
  getQuarterReport: async (quarterPlanId: string) => {
    const { data } = await client.get(`/reports/quarter/${quarterPlanId}`);
    return data;
  },
};
