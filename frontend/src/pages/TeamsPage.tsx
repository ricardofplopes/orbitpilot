import React, { useState } from 'react';
import { Users, X } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { useTeam } from '@/context/TeamContext';
import { teams as teamsApi } from '@/api/services';
import Badge from '@/components/common/Badge';
import Spinner from '@/components/common/Spinner';
import ErrorState from '@/components/common/ErrorState';
import EmptyState from '@/components/common/EmptyState';
import client from '@/api/client';

interface MemberStats {
  id: string;
  name: string;
  email: string;
  role: string;
  weeklyCapacity: number;
  activeItems: number;
  doneItems: number;
  totalSp: number;
}

const TeamsPage: React.FC = () => {
  const { selectedTeamId, selectedTeam } = useTeam();
  const { data: members, loading, error, refetch } = useApi<MemberStats[]>(
    () => selectedTeamId
      ? client.get(`/teams/${selectedTeamId}/member-stats`).then(r => r.data)
      : Promise.resolve([]),
    [selectedTeamId]
  );
  const [removing, setRemoving] = useState<string | null>(null);

  const handleRemoveMember = async (memberId: string, name: string) => {
    if (!selectedTeamId) return;
    if (!confirm(`Remove ${name} from this team?`)) return;
    setRemoving(memberId);
    try {
      await client.delete(`/teams/${selectedTeamId}/members/${memberId}`);
      refetch();
    } catch (err) {
      console.error('Failed to remove member', err);
    } finally {
      setRemoving(null);
    }
  };

  if (!selectedTeamId) {
    return <EmptyState title="No team selected" description="Select a team from the top bar to view members" />;
  }

  if (loading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-orbit-slate">Members of</p>
        <h2 className="text-2xl font-bold text-orbit-light">{selectedTeam?.name || 'Team'}</h2>
        <p className="text-sm text-orbit-slate mt-1">{members?.length || 0} team members</p>
      </div>

      {!members?.length ? (
        <EmptyState
          icon={<Users className="w-12 h-12" />}
          title="No members yet"
          description="Sync from Jira to automatically populate team members from issue assignees"
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-orbit-navy-lighter/50">
          <table className="w-full">
            <thead className="bg-orbit-navy-light">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-orbit-slate uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-orbit-slate uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-orbit-slate uppercase">Role</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-orbit-slate uppercase">Active Items</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-orbit-slate uppercase">Done</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-orbit-slate uppercase">SP Delivered</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-orbit-slate uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-orbit-navy-lighter/30">
              {members.map((m) => (
                <tr key={m.id || m.email} className="hover:bg-orbit-navy-light/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-white">
                          {m.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-orbit-light">{m.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-orbit-slate">{m.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant={m.role === 'lead' ? 'purple' : 'blue'}>{m.role}</Badge>
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-orbit-light">{m.activeItems}</td>
                  <td className="px-4 py-3 text-center text-sm text-green-400">{m.doneItems}</td>
                  <td className="px-4 py-3 text-center text-sm font-medium text-orbit-light">{m.totalSp}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleRemoveMember(m.id, m.name)}
                      disabled={removing === m.id}
                      className="p-1.5 rounded-lg text-orbit-slate hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                      title="Remove from team"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TeamsPage;
