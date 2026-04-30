import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import { useApi } from '@/hooks/useApi';
import { useTeam } from '@/context/TeamContext';
import { reports, teams as teamsApi, dashboard as dashboardApi } from '@/api/services';
import DateSprintFilter, { FilterState, getDefaultQuarterFilter } from '@/components/filters/DateSprintFilter';
import MetricCard from '@/components/cards/MetricCard';
import Spinner from '@/components/common/Spinner';
import ErrorState from '@/components/common/ErrorState';
import EmptyState from '@/components/common/EmptyState';
import Badge from '@/components/common/Badge';
import client from '@/api/client';
import type { Team } from '@/types';

const COLORS = ['#2563EB', '#7C3AED', '#10B981', '#F59E0B', '#EF4444', '#06B6D4'];

const ReportsPage: React.FC = () => {
  const { selectedTeamId, selectedTeam } = useTeam();
  const [tab, setTab] = useState<'sprints' | 'team' | 'overall'>('sprints');
  const [dateFilter, setDateFilter] = useState<FilterState>(getDefaultQuarterFilter);
  const [sprints, setSprints] = useState<Array<{ name: string; itemCount: number }>>([]);

  useEffect(() => {
    dashboardApi.getSprints(selectedTeamId || undefined).then(setSprints).catch(() => {});
  }, [selectedTeamId]);

  const { data: overallData, loading, error, refetch } = useApi<any>(() => reports.getOverall());
  const { data: teamReport } = useApi<any>(
    () => selectedTeamId ? reports.getTeamReport(selectedTeamId) : Promise.resolve(null),
    [selectedTeamId]
  );
  // Sprint data from dashboard endpoint with date filter applied
  const { data: sprintData } = useApi<any>(
    () => {
      if (!selectedTeamId) return Promise.resolve(null);
      const startDate = dateFilter?.mode === 'date' ? dateFilter.startDate : undefined;
      const endDate = dateFilter?.mode === 'date' ? dateFilter.endDate : undefined;
      const sprintFilter = dateFilter?.mode === 'sprint' ? dateFilter.sprints : undefined;
      return dashboardApi.getDashboard(selectedTeamId, startDate, endDate, sprintFilter);
    },
    [selectedTeamId, dateFilter]
  );

  if (loading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const statusData = Object.entries(overallData?.workByStatus || {}).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-orbit-light">Reports</h2>
          <p className="text-sm text-orbit-slate mt-1">Analytics and insights across your team and sprints</p>
        </div>
        <DateSprintFilter value={dateFilter} onChange={setDateFilter} availableSprints={sprints} />
      </div>

      {/* Tab Selector */}
      <div className="flex items-center gap-2">
        {(['sprints', 'team', 'overall'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
              tab === t ? 'bg-gradient-brand text-white shadow-glow-blue' : 'bg-orbit-navy-lighter text-orbit-slate hover:text-orbit-light'
            }`}
          >
            {t === 'sprints' ? 'Sprints' : t === 'team' ? 'Team' : 'Organization'}
          </button>
        ))}
      </div>

      {/* Sprints Tab */}
      {tab === 'sprints' && (
        <>
          {!selectedTeamId ? (
            <EmptyState title="No team selected" description="Select a team from the top bar to view sprint reports" />
          ) : !sprintData?.velocity?.length ? (
            <EmptyState title="No sprint data" description="Sprint velocity will appear after syncing issues from Jira that have sprint information" />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <MetricCard title="Sprints" value={sprintData.velocity.length} accentColor="blue" />
                <MetricCard
                  title="Avg Items/Sprint"
                  value={Math.round(sprintData.velocity.reduce((s: number, v: any) => s + v.itemCount, 0) / sprintData.velocity.length)}
                  accentColor="purple"
                />
                <MetricCard
                  title="Total Items Delivered"
                  value={sprintData.velocity.reduce((s: number, v: any) => s + v.itemCount, 0)}
                  accentColor="green"
                />
                <MetricCard
                  title="Total SP Delivered"
                  value={sprintData.velocity.reduce((s: number, v: any) => s + v.storyPoints, 0)}
                  accentColor="amber"
                />
              </div>

              {/* Velocity Trend Line */}
              <div className="card">
                <h3 className="text-lg font-semibold text-orbit-light mb-4">Velocity Trend</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={sprintData.velocity}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="sprint" tick={{ fill: '#94a3b8', fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} labelStyle={{ color: '#f8fafc' }} />
                    <Line type="monotone" dataKey="itemCount" stroke="#818cf8" strokeWidth={2} dot={{ fill: '#818cf8' }} name="Items" />
                    <Line type="monotone" dataKey="storyPoints" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1' }} name="Story Points" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Sprint Table */}
              <div className="card">
                <h3 className="text-lg font-semibold text-orbit-light mb-4">All Sprints</h3>
                <div className="overflow-x-auto rounded-xl border border-orbit-navy-lighter/50">
                  <table className="w-full">
                    <thead className="bg-orbit-navy-light">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-orbit-slate uppercase">Sprint</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-orbit-slate uppercase">Items Completed</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-orbit-slate uppercase">Story Points</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-orbit-navy-lighter/30">
                      {[...sprintData.velocity].reverse().map((s: any) => (
                        <tr key={s.sprint} className="hover:bg-orbit-navy-light/50 transition-colors">
                          <td className="px-4 py-3 text-sm font-medium text-orbit-light">{s.sprint}</td>
                          <td className="px-4 py-3 text-center text-sm text-orbit-light">{s.itemCount}</td>
                          <td className="px-4 py-3 text-center text-sm text-orbit-light">{s.storyPoints}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Team Tab */}
      {tab === 'team' && (
        <>
          {!selectedTeamId ? (
            <EmptyState title="No team selected" description="Select a team from the top bar to view team report" />
          ) : !teamReport ? (
            <EmptyState title="No team data" description="No report data available for this team" />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard title="Members" value={teamReport.memberCount} accentColor="blue" />
                <MetricCard title="Work Items" value={teamReport.totalWorkItems} accentColor="purple" />
                <MetricCard title="Completion" value={`${teamReport.completionRate}%`} accentColor="green" />
                <MetricCard title="Cycle Time" value={`${teamReport.avgCycleTime}d`} accentColor="amber" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card">
                  <h3 className="text-lg font-semibold text-orbit-light mb-4">Work Distribution</h3>
                  <div className="space-y-3">
                    {Object.entries(teamReport.workByStatus || {}).map(([status, count]) => (
                      <div key={status} className="flex items-center justify-between">
                        <span className="text-sm text-orbit-slate capitalize">{status.replace('_', ' ')}</span>
                        <div className="flex items-center gap-3">
                          <div className="w-32 h-2 bg-orbit-navy rounded-full overflow-hidden">
                            <div className="h-full bg-orbit-blue rounded-full" style={{ width: `${teamReport.totalWorkItems > 0 ? ((count as number) / teamReport.totalWorkItems) * 100 : 0}%` }} />
                          </div>
                          <span className="text-sm font-medium text-orbit-light w-8 text-right">{count as number}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card">
                  <h3 className="text-lg font-semibold text-orbit-light mb-4">Team Members</h3>
                  <div className="space-y-2 max-h-[280px] overflow-y-auto">
                    {teamReport.members?.map((m: any) => (
                      <div key={m.id} className="flex items-center justify-between p-2 rounded-lg bg-orbit-navy">
                        <span className="text-sm text-orbit-light">{m.name}</span>
                        <Badge variant={m.role === 'lead' ? 'purple' : m.role === 'manager' ? 'amber' : 'blue'}>{m.role}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Overall/Organization Tab */}
      {tab === 'overall' && overallData && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard title="Teams" value={overallData.totalTeams} accentColor="blue" />
            <MetricCard title="Members" value={overallData.totalMembers} accentColor="purple" />
            <MetricCard title="Work Items" value={overallData.totalWorkItems} accentColor="green" />
            <MetricCard title="Avg Cycle Time" value={`${overallData.avgCycleTime}d`} accentColor="amber" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="text-lg font-semibold text-orbit-light mb-4">Work by Status</h3>
              {statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" outerRadius={100} dataKey="value" nameKey="name" label={({ name, value }) => `${name}: ${value}`}>
                      {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#0F172A', border: '1px solid #334155', borderRadius: '8px' }} />
                    <Legend wrapperStyle={{ color: '#94A3B8' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-orbit-slate py-8 text-center">No data available</p>
              )}
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold text-orbit-light mb-4">Team Performance</h3>
              {overallData.teams?.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={overallData.teams} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 12 }} axisLine={{ stroke: '#334155' }} />
                    <YAxis tick={{ fill: '#64748B', fontSize: 12 }} axisLine={{ stroke: '#334155' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0F172A', border: '1px solid #334155', borderRadius: '8px' }} labelStyle={{ color: '#F1F5F9' }} />
                    <Bar dataKey="completedWork" name="Completed" fill="#10B981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="totalWork" name="Total" fill="#2563EB" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-orbit-slate py-8 text-center">No data available</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ReportsPage;
