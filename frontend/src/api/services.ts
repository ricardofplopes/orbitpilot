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
  createPeriod: async (payload: Partial<CapacityPeriod>) => {
    const { data } = await client.post<CapacityPeriod>('/capacity/periods', payload);
    return data;
  },
  setAvailability: async (payload: Partial<Availability>) => {
    const { data } = await client.post<Availability>('/capacity/availability', payload);
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
};

// Work
export const work = {
  getWorkItems: async (filters?: { teamId?: string; status?: string; source?: string }) => {
    const params = new URLSearchParams();
    if (filters?.teamId) params.append('teamId', filters.teamId);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.source) params.append('source', filters.source);
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
  disconnectJira: async () => {
    const { data } = await client.post('/integrations/jira/disconnect');
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
  getDashboard: async () => {
    const { data } = await client.get<DashboardData>('/dashboard');
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
