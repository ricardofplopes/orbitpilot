export enum WorkItemStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  IN_REVIEW = 'in_review',
  DONE = 'done',
}

export enum Priority {
  P1 = 'P1',
  P2 = 'P2',
  P3 = 'P3',
}

export enum WorkItemSource {
  MANUAL = 'manual',
  JIRA = 'jira',
  GITHUB = 'github',
}

export enum InitiativeStatus {
  PLANNED = 'planned',
  IN_PROGRESS = 'in_progress',
  AT_RISK = 'at_risk',
  DONE = 'done',
}

export enum QuarterPlanStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  COMPLETED = 'completed',
}

export enum TeamRole {
  LEAD = 'lead',
  ENGINEER = 'engineer',
  DESIGNER = 'designer',
  PM = 'pm',
}

export enum AvailabilityType {
  PTO = 'pto',
  HOLIDAY = 'holiday',
  PARTIAL = 'partial',
}

export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  MEMBER = 'member',
}

export enum InsightSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

export enum InsightType {
  CAPACITY = 'capacity',
  RISK = 'risk',
  DELIVERY = 'delivery',
  TREND = 'trend',
}
