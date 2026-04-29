import React, { useState } from 'react';
import { ChevronUp, ChevronDown, MoreHorizontal } from 'lucide-react';
import Badge from '@/components/common/Badge';
import type { Initiative } from '@/types';

interface PlanningTableProps {
  initiatives: Initiative[];
  onEdit?: (initiative: Initiative) => void;
}

type SortKey = 'title' | 'priority' | 'status' | 'estimatedEffort';

const priorityVariant = (p: string) => {
  switch (p.toLowerCase()) {
    case 'critical': return 'red';
    case 'high': return 'amber';
    case 'medium': return 'blue';
    default: return 'slate';
  }
};

const statusVariant = (s: string) => {
  switch (s.toLowerCase()) {
    case 'done': case 'completed': return 'green';
    case 'in-progress': case 'in_progress': return 'blue';
    case 'at-risk': case 'at_risk': return 'amber';
    case 'blocked': return 'red';
    default: return 'slate';
  }
};

const PlanningTable: React.FC<PlanningTableProps> = ({ initiatives, onEdit }) => {
  const [sortKey, setSortKey] = useState<SortKey>('priority');
  const [sortAsc, setSortAsc] = useState(true);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const sorted = [...initiatives].sort((a, b) => {
    const aVal = a[sortKey] ?? '';
    const bVal = b[sortKey] ?? '';
    const cmp = String(aVal).localeCompare(String(bVal));
    return sortAsc ? cmp : -cmp;
  });

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return null;
    return sortAsc ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />;
  };

  const thClass = 'px-4 py-3 text-left text-xs font-medium text-orbit-slate uppercase tracking-wider cursor-pointer hover:text-orbit-light select-none';

  return (
    <div className="overflow-x-auto rounded-xl border border-orbit-navy-lighter/50">
      <table className="w-full">
        <thead className="bg-orbit-navy-light">
          <tr>
            <th className={thClass} onClick={() => handleSort('title')}>
              <span className="flex items-center gap-1">Title <SortIcon col="title" /></span>
            </th>
            <th className={`${thClass} w-32`}>Team</th>
            <th className={thClass} onClick={() => handleSort('priority')}>
              <span className="flex items-center gap-1">Priority <SortIcon col="priority" /></span>
            </th>
            <th className={thClass} onClick={() => handleSort('estimatedEffort')}>
              <span className="flex items-center gap-1">Effort <SortIcon col="estimatedEffort" /></span>
            </th>
            <th className={thClass} onClick={() => handleSort('status')}>
              <span className="flex items-center gap-1">Status <SortIcon col="status" /></span>
            </th>
            <th className={`${thClass} w-16`} />
          </tr>
        </thead>
        <tbody className="divide-y divide-orbit-navy-lighter/30">
          {sorted.map((item) => (
            <tr key={item.id} className="hover:bg-orbit-navy-light/50 transition-colors">
              <td className="px-4 py-3 text-sm text-orbit-light font-medium">{item.title}</td>
              <td className="px-4 py-3 text-sm text-orbit-slate">{item.team?.name || '—'}</td>
              <td className="px-4 py-3">
                <Badge variant={priorityVariant(item.priority)}>{item.priority}</Badge>
              </td>
              <td className="px-4 py-3 text-sm text-orbit-slate">{item.estimatedEffort ?? '—'}</td>
              <td className="px-4 py-3">
                <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
              </td>
              <td className="px-4 py-3">
                <button onClick={() => onEdit?.(item)} className="p-1 rounded hover:bg-orbit-navy-lighter transition-colors">
                  <MoreHorizontal className="w-4 h-4 text-orbit-slate" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PlanningTable;
