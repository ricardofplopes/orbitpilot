import React, { useState, useMemo } from 'react';
import { Package, ChevronDown, ChevronRight, ExternalLink, Search } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { useTeam } from '@/context/TeamContext';
import Badge from '@/components/common/Badge';
import Spinner from '@/components/common/Spinner';
import ErrorState from '@/components/common/ErrorState';
import EmptyState from '@/components/common/EmptyState';
import client from '@/api/client';

interface ReleaseData {
  id: string;
  version: string;
  status: string;
  startDate: string | null;
  releaseDate: string | null;
  description: string | null;
  totalItems: number;
  doneItems: number;
  inProgressItems: number;
  todoItems: number;
  progress: number;
  storyPoints: number;
}

interface ReleaseItem {
  id: string;
  externalId: string | null;
  title: string;
  status: string;
  priority: string | null;
  assignee: string | null;
  storyPoints: number | null;
  type: string | null;
  sprint: string | null;
  externalUrl: string | null;
}

const statusOptions = [
  { value: 'unreleased', label: 'Unreleased' },
  { value: 'released', label: 'Released' },
  { value: 'archived', label: 'Archived' },
];

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const ReleasesPage: React.FC = () => {
  const { selectedTeamId, selectedTeam } = useTeam();
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['unreleased']);
  const [expandedRelease, setExpandedRelease] = useState<string | null>(null);
  const [releaseItems, setReleaseItems] = useState<ReleaseItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showStatusFilter, setShowStatusFilter] = useState(false);

  const statusParam = selectedStatuses.join(',');
  const { data: releases, loading, error, refetch } = useApi<ReleaseData[]>(
    () => {
      const params = new URLSearchParams();
      if (selectedTeamId) params.set('teamId', selectedTeamId);
      if (statusParam) params.set('status', statusParam);
      return client.get(`/work/releases?${params.toString()}`).then(r => r.data);
    },
    [selectedTeamId, statusParam]
  );

  const filteredReleases = useMemo(() => {
    if (!releases) return [];
    if (!searchQuery) return releases;
    return releases.filter(r => r.version.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [releases, searchQuery]);

  const toggleStatus = (status: string) => {
    setSelectedStatuses(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const handleExpandRelease = async (releaseId: string) => {
    if (expandedRelease === releaseId) {
      setExpandedRelease(null);
      return;
    }
    setExpandedRelease(releaseId);
    setLoadingItems(true);
    try {
      const params = selectedTeamId ? `?teamId=${selectedTeamId}` : '';
      const { data } = await client.get(`/work/releases/${releaseId}${params}`);
      setReleaseItems(data.items || []);
    } catch {
      setReleaseItems([]);
    } finally {
      setLoadingItems(false);
    }
  };

  if (!selectedTeamId) {
    return <EmptyState title="No team selected" description="Select a team from the top bar to view releases" />;
  }

  if (loading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const statusLabel = selectedStatuses.length === 0
    ? 'All'
    : selectedStatuses.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', ');

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-orbit-slate">Releases for</p>
        <h2 className="text-2xl font-bold text-orbit-light">{selectedTeam?.name || 'Team'}</h2>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orbit-slate" />
          <input
            className="input pl-9 w-48 text-sm"
            placeholder="Search releases..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="relative">
          <button
            onClick={() => setShowStatusFilter(!showStatusFilter)}
            className="btn-secondary text-sm flex items-center gap-1.5"
          >
            {statusLabel}
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          {showStatusFilter && (
            <div className="absolute top-full mt-1 left-0 z-50 bg-orbit-card border border-orbit-card/60 rounded-lg shadow-xl p-2 min-w-[160px]">
              {statusOptions.map(opt => (
                <label key={opt.value} className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-orbit-navy rounded text-sm text-orbit-light">
                  <input
                    type="checkbox"
                    checked={selectedStatuses.includes(opt.value)}
                    onChange={() => toggleStatus(opt.value)}
                    className="rounded border-orbit-slate"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          )}
        </div>
        <span className="text-xs text-orbit-slate ml-auto">{filteredReleases.length} releases</span>
      </div>

      {/* Releases table */}
      {filteredReleases.length === 0 ? (
        <EmptyState
          icon={<Package className="w-12 h-12" />}
          title="No releases found"
          description="No releases match your filters. Try changing the status filter or syncing from Jira."
        />
      ) : (
        <div className="card p-0 overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[1fr_100px_200px_100px_110px] gap-4 px-4 py-3 border-b border-orbit-navy text-xs font-medium text-orbit-slate uppercase">
            <div>Release</div>
            <div>Status</div>
            <div>Progress</div>
            <div>Start date</div>
            <div>Release date</div>
          </div>

          {/* Rows */}
          {filteredReleases.map(release => (
            <div key={release.id}>
              <div
                className="grid grid-cols-[1fr_100px_200px_100px_110px] gap-4 px-4 py-3 border-b border-orbit-navy/50 hover:bg-orbit-navy/30 cursor-pointer items-center transition-colors"
                onClick={() => handleExpandRelease(release.id)}
              >
                <div className="flex items-center gap-2">
                  {expandedRelease === release.id ? (
                    <ChevronDown className="w-4 h-4 text-orbit-slate shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-orbit-slate shrink-0" />
                  )}
                  <span className="text-sm font-medium text-orbit-blue hover:underline">{release.version}</span>
                </div>
                <div>
                  <Badge variant={
                    release.status === 'released' ? 'green'
                    : release.status === 'archived' ? 'slate'
                    : 'blue'
                  }>
                    {release.status.toUpperCase()}
                  </Badge>
                </div>
                <div>
                  {release.totalItems === 0 ? (
                    <span className="text-xs text-orbit-slate">No work items</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-orbit-navy rounded-full overflow-hidden flex">
                        {release.doneItems > 0 && (
                          <div className="h-full bg-green-500" style={{ width: `${(release.doneItems / release.totalItems) * 100}%` }} />
                        )}
                        {release.inProgressItems > 0 && (
                          <div className="h-full bg-blue-500" style={{ width: `${(release.inProgressItems / release.totalItems) * 100}%` }} />
                        )}
                        {release.todoItems > 0 && (
                          <div className="h-full bg-gray-500" style={{ width: `${(release.todoItems / release.totalItems) * 100}%` }} />
                        )}
                      </div>
                      <span className="text-[10px] text-orbit-slate shrink-0">{release.totalItems}</span>
                    </div>
                  )}
                </div>
                <div className="text-xs text-orbit-slate">{formatDate(release.startDate)}</div>
                <div className="text-xs text-orbit-slate">{formatDate(release.releaseDate)}</div>
              </div>

              {/* Expanded detail */}
              {expandedRelease === release.id && (
                <div className="px-6 py-4 bg-orbit-navy/20 border-b border-orbit-navy/50">
                  {release.description && (
                    <p className="text-xs text-orbit-slate mb-3">{release.description}</p>
                  )}
                  <div className="flex gap-4 mb-3 text-xs">
                    <span className="text-green-400">✓ {release.doneItems} done</span>
                    <span className="text-blue-400">● {release.inProgressItems} in progress</span>
                    <span className="text-orbit-slate">○ {release.todoItems} to do</span>
                    <span className="text-orbit-slate">({release.storyPoints} SP)</span>
                  </div>

                  {loadingItems ? (
                    <div className="flex justify-center py-4"><Spinner /></div>
                  ) : releaseItems.length === 0 ? (
                    <p className="text-xs text-orbit-slate">No items in this release</p>
                  ) : (
                    <div className="space-y-1 max-h-[400px] overflow-y-auto">
                      <div className="grid grid-cols-[50px_1fr_100px_80px_120px_80px] gap-2 text-[10px] font-medium text-orbit-slate uppercase pb-1 border-b border-orbit-navy/50">
                        <div>Key</div>
                        <div>Summary</div>
                        <div>Status</div>
                        <div>Priority</div>
                        <div>Assignee</div>
                        <div>SP</div>
                      </div>
                      {releaseItems.map(item => (
                        <div key={item.id} className="grid grid-cols-[50px_1fr_100px_80px_120px_80px] gap-2 text-xs py-1.5 items-center">
                          <div>
                            {item.externalUrl ? (
                              <a href={item.externalUrl} target="_blank" rel="noopener noreferrer" className="text-orbit-blue hover:underline flex items-center gap-0.5">
                                {item.externalId || '—'}
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            ) : (
                              <span className="text-orbit-slate">{item.externalId || '—'}</span>
                            )}
                          </div>
                          <div className="text-orbit-light truncate">{item.title}</div>
                          <div>
                            <Badge variant={
                              item.status === 'done' ? 'green'
                              : item.status === 'in_progress' ? 'blue'
                              : item.status === 'in_review' ? 'purple'
                              : 'slate'
                            }>
                              {item.status}
                            </Badge>
                          </div>
                          <div className="text-orbit-slate">{item.priority || '—'}</div>
                          <div className="text-orbit-slate truncate">{item.assignee || 'Unassigned'}</div>
                          <div className="text-orbit-slate">{item.storyPoints || '—'}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReleasesPage;
