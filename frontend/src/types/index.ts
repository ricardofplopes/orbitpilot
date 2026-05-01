export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatarUrl?: string;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  color?: string;
  members?: TeamMember[];
}

export interface TeamMember {
  id: string;
  userId: string;
  teamId: string;
  role: string;
  weeklyCapacity: number;
  user?: User;
}

export interface CapacityPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

export interface Availability {
  id: string;
  teamMemberId: string;
  date: string;
  type: string;
  hours: number;
}

export interface QuarterPlan {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  initiatives?: Initiative[];
}

export interface Initiative {
  id: string;
  title: string;
  description?: string;
  quarterPlanId: string;
  teamId?: string;
  priority: string;
  estimatedEffort?: number;
  status: string;
  team?: Team;
  workItems?: WorkItem[];
}

export interface WorkItem {
  id: string;
  externalId?: string;
  source: string;
  title: string;
  description?: string;
  status: string;
  priority?: string;
  storyPoints?: number;
  assignee?: string;
  teamId?: string;
  initiativeId?: string;
  cycleTime?: number;
  team?: Team;
}

export interface IntegrationConfig {
  id: string;
  type: string;
  config: Record<string, any>;
  isActive: boolean;
  lastSyncAt?: string;
}

export interface Insight {
  id: string;
  type: string;
  severity: string;
  message: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface DashboardData {
  teamCapacityPercent: number;
  committedWork: number;
  atRiskWork: number;
  avgCycleTime: number;
  workByStatus: Record<string, number>;
  workByTeam: { team: string; count: number }[];
  capacityByTeam: { team: string; available: number; committed: number; atRisk: number; unavailable: number }[];
  topPriorities: Initiative[];
  insights: Insight[];
}


export interface EpicPlan {
  id: string;
  key: string | null;
  title: string;
  status: string;
  priority?: string | null;
  team?: { id: string; name: string; color?: string } | null;
  teamId?: string | null;
  tShirtSize: string | null;
  sizedStoryPoints: number | null;
  storyPoints: number | null;
  quarter: string | null;
  externalUrl?: string | null;
  children: { total: number; done: number; sp: number; doneSp: number };
}

export interface QuarterImpact {
  quarter: string;
  epicCount: number;
  unsizedCount: number;
  totalEstimatedSp: number;
  tShirtMap: Record<string, number>;
  teams: Array<{ teamId: string; teamName: string; color?: string; estimatedSp: number; epicCount: number; unsizedCount: number }>;
}

export interface JiraField {
  id: string;
  name: string;
  custom: boolean;
}

export interface JiraFieldMapping {
  storyPoints?: string;
  sprint?: string;
  epicLink?: string;
  tShirtSize?: string;
  quarter?: string;
}
