import React from 'react';
import { Package, ExternalLink } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { useTeam } from '@/context/TeamContext';
import Badge from '@/components/common/Badge';
import Spinner from '@/components/common/Spinner';
import ErrorState from '@/components/common/ErrorState';
import EmptyState from '@/components/common/EmptyState';
import client from '@/api/client';

interface ReleaseData {
  version: string;
  totalItems: number;
  doneItems: number;
  inProgressItems: number;
  todoItems: number;
  progress: number;
  storyPoints: number;
}

const ReleasesPage: React.FC = () => {
  const { selectedTeamId, selectedTeam } = useTeam();
  const { data: releases, loading, error, refetch } = useApi<ReleaseData[]>(
    () => selectedTeamId
      ? client.get(`/work/releases?teamId=${selectedTeamId}`).then(r => r.data)
      : Promise.resolve([]),
    [selectedTeamId]
  );

  if (!selectedTeamId) {
    return <EmptyState title="No team selected" description="Select a team from the top bar to view releases" />;
  }

  if (loading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  if (!releases?.length) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-orbit-light">Releases</h2>
          <p className="text-sm text-orbit-slate mt-1">Track delivery progress by Jira fix version</p>
        </div>
        <EmptyState
          icon={<Package className="w-12 h-12" />}
          title="No releases found"
          description="Releases are populated from Jira fix versions. Make sure your issues have fix versions assigned and re-sync."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-orbit-slate">Releases for</p>
        <h2 className="text-2xl font-bold text-orbit-light">{selectedTeam?.name || 'Team'}</h2>
        <p className="text-sm text-orbit-slate mt-1">{releases.length} releases tracked</p>
      </div>

      <div className="space-y-4">
        {releases.map((release) => (
          <div key={release.version} className="card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-orbit-blue" />
                <h3 className="text-lg font-semibold text-orbit-light">{release.version}</h3>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={release.progress === 100 ? 'green' : release.progress > 50 ? 'blue' : 'amber'}>
                  {release.progress}%
                </Badge>
                <span className="text-xs text-orbit-slate">{release.doneItems}/{release.totalItems} items</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2.5 bg-orbit-navy rounded-full overflow-hidden mb-3">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${release.progress}%`,
                  background: release.progress === 100 ? '#10B981' : release.progress > 50 ? '#2563EB' : '#F59E0B',
                }}
              />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-3">
              <div className="text-center p-2 rounded-lg bg-orbit-navy">
                <p className="text-lg font-bold text-orbit-light">{release.totalItems}</p>
                <p className="text-xs text-orbit-slate">Total</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-orbit-navy">
                <p className="text-lg font-bold text-green-400">{release.doneItems}</p>
                <p className="text-xs text-orbit-slate">Done</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-orbit-navy">
                <p className="text-lg font-bold text-blue-400">{release.inProgressItems}</p>
                <p className="text-xs text-orbit-slate">In Progress</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-orbit-navy">
                <p className="text-lg font-bold text-orbit-slate">{release.todoItems}</p>
                <p className="text-xs text-orbit-slate">To Do</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReleasesPage;
