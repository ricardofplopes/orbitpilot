import React, { useState, useMemo, useCallback } from 'react';
import { Users, Search, CheckSquare, Square } from 'lucide-react';
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
  isActive: boolean;
  activeItems: number;
  doneItems: number;
  totalSp: number;
}

type FilterTab = 'all' | 'active' | 'inactive';

const TeamsPage: React.FC = () => {
  const { selectedTeamId, selectedTeam } = useTeam();
  const { data: members, loading, error, refetch, setData } = useApi<MemberStats[]>(
    () => selectedTeamId
      ? client.get(`/teams/${selectedTeamId}/member-stats`).then(r => r.data)
      : Promise.resolve([]),
    [selectedTeamId]
  );
  const [toggling, setToggling] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<FilterTab>('all');

  const handleToggleActive = useCallback(async (memberId: string, currentActive: boolean) => {
    if (!selectedTeamId || !members) return;
    // Optimistic update
    setData(members.map(m => m.id === memberId ? { ...m, isActive: !currentActive } : m));
    setToggling(prev => new Set(prev).add(memberId));
    try {
      await teamsApi.toggleMemberActive(selectedTeamId, memberId, !currentActive);
    } catch (err) {
      // Revert on failure
      setData(members.map(m => m.id === memberId ? { ...m, isActive: currentActive } : m));
      console.error('Failed to toggle member', err);
    } finally {
      setToggling(prev => { const next = new Set(prev); next.delete(memberId); return next; });
    }
  }, [selectedTeamId, members, setData]);

  const handleSelectAll = useCallback(async () => {
    if (!selectedTeamId || !members) return;
    const inactiveMembers = members.filter(m => !m.isActive);
    if (inactiveMembers.length === 0) return;
    // Optimistic: set all active
    setData(members.map(m => ({ ...m, isActive: true })));
    try {
      await Promise.all(inactiveMembers.map(m => teamsApi.toggleMemberActive(selectedTeamId, m.id, true)));
    } catch (err) {
      refetch(); // Revert by refetching on error
    }
  }, [selectedTeamId, members, setData, refetch]);

  const handleDeselectAll = useCallback(async () => {
    if (!selectedTeamId || !members) return;
    const activeMembers = members.filter(m => m.isActive);
    if (activeMembers.length === 0) return;
    // Optimistic: set all inactive
    setData(members.map(m => ({ ...m, isActive: false })));
    try {
      await Promise.all(activeMembers.map(m => teamsApi.toggleMemberActive(selectedTeamId, m.id, false)));
    } catch (err) {
      refetch();
    }
  }, [selectedTeamId, members, setData, refetch]);

  const filteredMembers = useMemo(() => {
    if (!members) return [];
    let result = members;
    if (filterTab === 'active') result = result.filter(m => m.isActive);
    else if (filterTab === 'inactive') result = result.filter(m => !m.isActive);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(m =>
        m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
      );
    }
    return result;
  }, [members, filterTab, search]);

  const counts = useMemo(() => {
    if (!members) return { all: 0, active: 0, inactive: 0 };
    return {
      all: members.length,
      active: members.filter(m => m.isActive).length,
      inactive: members.filter(m => !m.isActive).length,
    };
  }, [members]);

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
        <p className="text-sm text-orbit-slate mt-1">{counts.active} active of {counts.all} total members</p>
      </div>

      {/* Search, filter, and bulk actions */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orbit-slate" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9 w-full"
          />
        </div>

        <div className="flex rounded-lg border border-orbit-navy-lighter/50 overflow-hidden">
          {(['all', 'active', 'inactive'] as FilterTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                filterTab === tab
                  ? 'bg-orbit-blue/20 text-orbit-blue'
                  : 'text-orbit-slate hover:text-orbit-light hover:bg-orbit-navy-light'
              }`}
            >
              {tab === 'all' ? `All (${counts.all})` : tab === 'active' ? `Active (${counts.active})` : `Inactive (${counts.inactive})`}
            </button>
          ))}
        </div>

        {/* Select/Deselect All */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSelectAll}
            disabled={counts.inactive === 0}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-orbit-navy-light text-orbit-slate hover:text-orbit-light hover:bg-orbit-navy-lighter/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <CheckSquare className="w-3.5 h-3.5" /> Select All
          </button>
          <button
            onClick={handleDeselectAll}
            disabled={counts.active === 0}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-orbit-navy-light text-orbit-slate hover:text-orbit-light hover:bg-orbit-navy-lighter/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Square className="w-3.5 h-3.5" /> Deselect All
          </button>
        </div>
      </div>

      {!filteredMembers.length ? (
        <EmptyState
          icon={<Users className="w-12 h-12" />}
          title={search ? 'No matching members' : 'No members yet'}
          description={search ? 'Try a different search term' : 'Sync from Jira to automatically populate team members from issue assignees'}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-orbit-navy-lighter/50">
          <table className="w-full">
            <thead className="bg-orbit-navy-light">
              <tr>
                <th className="px-4 py-3 text-center text-xs font-medium text-orbit-slate uppercase w-12">Active</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-orbit-slate uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-orbit-slate uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-orbit-slate uppercase">Role</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-orbit-slate uppercase">Active Items</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-orbit-slate uppercase">Done</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-orbit-slate uppercase">SP Delivered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-orbit-navy-lighter/30">
              {filteredMembers.map((m) => (
                <tr key={m.id} className={`hover:bg-orbit-navy-light/50 transition-colors ${!m.isActive ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={m.isActive}
                      disabled={toggling.has(m.id)}
                      onChange={() => handleToggleActive(m.id, m.isActive)}
                      className="w-4 h-4 rounded border-orbit-navy-lighter text-orbit-blue focus:ring-orbit-blue/50 cursor-pointer disabled:cursor-wait"
                    />
                  </td>
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

