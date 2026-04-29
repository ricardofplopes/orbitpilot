import React, { useState } from 'react';
import { Users, Search, Mail } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { teams as teamsApi } from '@/api/services';
import Spinner from '@/components/common/Spinner';
import ErrorState from '@/components/common/ErrorState';
import EmptyState from '@/components/common/EmptyState';
import Badge from '@/components/common/Badge';
import type { Team, TeamMember } from '@/types';

const PeoplePage: React.FC = () => {
  const { data: teamsList, loading, error, refetch } = useApi<Team[]>(() => teamsApi.getTeams());
  const [filterTeam, setFilterTeam] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [search, setSearch] = useState('');

  if (loading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const allMembers: (TeamMember & { teamName: string; teamColor?: string })[] = [];
  teamsList?.forEach((team) => {
    team.members?.forEach((m) => {
      allMembers.push({ ...m, teamName: team.name, teamColor: team.color });
    });
  });

  const filtered = allMembers.filter((m) => {
    if (filterTeam && m.teamId !== filterTeam) return false;
    if (filterRole && m.role !== filterRole) return false;
    if (search) {
      const name = m.user?.name?.toLowerCase() || '';
      const email = m.user?.email?.toLowerCase() || '';
      const term = search.toLowerCase();
      return name.includes(term) || email.includes(term);
    }
    return true;
  });

  const uniqueRoles = [...new Set(allMembers.map((m) => m.role))];
  const totalCapacity = filtered.reduce((s, m) => s + m.weeklyCapacity, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-orbit-light">People</h2>
        <p className="text-sm text-orbit-slate mt-1">All team members across your organization</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <p className="text-sm text-orbit-slate">Total People</p>
          <p className="text-2xl font-bold text-orbit-blue">{allMembers.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-orbit-slate">Teams</p>
          <p className="text-2xl font-bold text-orbit-purple">{teamsList?.length || 0}</p>
        </div>
        <div className="card">
          <p className="text-sm text-orbit-slate">Total Weekly Capacity</p>
          <p className="text-2xl font-bold text-orbit-green">{totalCapacity}h</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orbit-slate" />
          <input
            className="input pl-10"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input max-w-[180px]" value={filterTeam} onChange={(e) => setFilterTeam(e.target.value)}>
          <option value="">All Teams</option>
          {teamsList?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select className="input max-w-[180px]" value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
          <option value="">All Roles</option>
          {uniqueRoles.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Users className="w-12 h-12" />} title="No people found" description="Try adjusting your filters" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-orbit-navy-lighter/50">
          <table className="w-full">
            <thead className="bg-orbit-navy-light">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-orbit-slate uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-orbit-slate uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-orbit-slate uppercase">Team</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-orbit-slate uppercase">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-orbit-slate uppercase">Weekly Capacity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-orbit-navy-lighter/30">
              {filtered.map((m) => (
                <tr key={m.id} className="hover:bg-orbit-navy-light/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center text-white text-xs font-bold">
                        {(m.user?.name || '?')[0].toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-orbit-light">{m.user?.name || m.userId}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-orbit-slate" />
                      <span className="text-sm text-orbit-slate">{m.user?.email || '—'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: m.teamColor || '#2563EB' }} />
                      <span className="text-sm text-orbit-slate">{m.teamName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={m.role === 'lead' ? 'purple' : m.role === 'manager' ? 'amber' : 'blue'}>
                      {m.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-orbit-navy rounded-full overflow-hidden">
                        <div className="h-full bg-orbit-blue rounded-full" style={{ width: `${(m.weeklyCapacity / 40) * 100}%` }} />
                      </div>
                      <span className="text-sm text-orbit-slate">{m.weeklyCapacity}h</span>
                    </div>
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

export default PeoplePage;
