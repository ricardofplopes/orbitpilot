export interface WorkItemFilterInput {
  teamId?: string;
  startDate?: string;
  endDate?: string;
  sprints?: string[];
}

/**
 * Shared filter contract for work-item based metrics:
 * - sprint mode takes precedence when sprints are provided
 * - date mode includes items active in range (createdAt OR updatedAt)
 * - team scope always applies when teamId is provided
 */
export function buildWorkItemWhere(input: WorkItemFilterInput): any {
  const where: any = {};

  if (input.teamId) {
    where.teamId = input.teamId;
  }

  if (input.sprints && input.sprints.length > 0) {
    where.sprint = { in: input.sprints };
    return where;
  }

  if (input.startDate || input.endDate) {
    const dateRange: any = {};
    if (input.startDate) dateRange.gte = new Date(input.startDate);
    if (input.endDate) dateRange.lte = new Date(input.endDate);

    where.OR = [{ createdAt: dateRange }, { updatedAt: dateRange }];
  }

  return where;
}

