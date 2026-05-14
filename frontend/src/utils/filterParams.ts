import type { FilterState } from '@/components/filters/DateSprintFilter';

export interface FilterRequestParams {
  startDate?: string;
  endDate?: string;
  sprints?: string[];
}

export function toFilterRequestParams(filter: FilterState): FilterRequestParams {
  if (!filter) return {};
  if (filter.mode === 'sprint') return { sprints: filter.sprints };
  return { startDate: filter.startDate, endDate: filter.endDate };
}

