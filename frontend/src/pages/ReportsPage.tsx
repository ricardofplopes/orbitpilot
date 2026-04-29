import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import { useApi } from '@/hooks/useApi';
import { reports, teams as teamsApi, planning } from '@/api/services';
import MetricCard from '@/components/cards/MetricCard';
import Spinner from '@/components/common/Spinner';
import ErrorState from '@/components/common/ErrorState';
import Badge from '@/components/common/Badge';
import type { Team, QuarterPlan } from '@/types';

const COLORS = ['#2563EB', '#7C3AED', '#10B981', '#F59E0B', '#EF4444', '#06B6D4'];

const ReportsPage: React.FC = () => {
  const [tab, setTab] = useState<'overall' | 'team' | 'quarter'>('overall');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedQuarter, setSelectedQuarter] = useState('');

  const { data: overallData, loading, error, refetch } = useApi<any>(() => reports.getOverall());
  const { data: teamsList } = useApi<Team[]>(() => teamsApi.getTeams());
  const { data: quarters } = useApi<QuarterPlan[]>(() => planning.getQuarters());
  const { data: teamReport } = useApi<any>(
    () => selectedTeam ? reports.getTeamReport(selectedTeam) : Promise.resolve(null),
    [selectedTeam]
  );
  const { data: quarterReport } = useApi<any>(
    () => selectedQuarter ? reports.getQuarterReport(selectedQuarter) : Promise.resolve(null),
    [selectedQuarter]
  );

  if (loading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const workByStatus = overallData?.workByStatus || {};
  const statusData = Object.entries(workByStatus).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-orbit-light">Reports</h2>
        <p className="text-sm text-orbit-slate mt-1">Analytics and insights across your organization</p>
      </div>

      {/* Tab Selector */}
      <div className="flex items-center gap-2">
        {(['overall', 'team', 'quarter'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
              tab === t ? 'bg-gradient-brand text-white shadow-glow-blue' : 'bg-orbit-navy-lighter text-orbit-slate hover:text-orbit-light'
            }`}
          >
            {t === 'overall' ? 'Organization' : t === 'team' ? 'By Team' : 'By Quarter'}
          </button>
        ))}
      </div>

      {/* Overall Tab */}
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

          {/* Recent Insights */}
          {overallData.recentInsights?.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold text-orbit-light mb-4">Recent Insights</h3>
              <div className="space-y-2">
                {overallData.recentInsights.slice(0, 5).map((insight: any) => (
                  <div key={insight.id} className={`flex items-start gap-3 p-3 rounded-lg ${
                    insight.severity === 'critical' ? 'bg-red-500/10' :
                    insight.severity === 'warning' ? 'bg-amber-500/10' :
                    'bg-blue-500/10'
                  }`}>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                      insight.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                      insight.severity === 'warning' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>{insight.severity}</span>
                    <span className="text-sm text-orbit-light">{insight.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Team Tab */}
      {tab === 'team' && (
        <>
          <select className="input max-w-xs" value={selectedTeam} onChange={(e) => setSelectedTeam(e.target.value)}>
            <option value="">Select a team...</option>
            {teamsList?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>

          {teamReport && (
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
                          <span className="text-sm font-medium text-orbit-light w-6 text-right">{count as number}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card">
                  <h3 className="text-lg font-semibold text-orbit-light mb-4">Team Members</h3>
                  <div className="space-y-2">
                    {teamReport.members?.map((m: any) => (
                      <div key={m.id} className="flex items-center justify-between p-2 rounded-lg bg-orbit-navy">
                        <span className="text-sm text-orbit-light">{m.name}</span>
                        <Badge variant={m.role === 'lead' ? 'purple' : m.role === 'manager' ? 'amber' : 'blue'}>{m.role}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {teamReport.initiatives?.length > 0 && (
                <div className="card">
                  <h3 className="text-lg font-semibold text-orbit-light mb-4">Initiatives</h3>
                  <div className="space-y-2">
                    {teamReport.initiatives.map((i: any) => (
                      <div key={i.id} className="flex items-center justify-between p-3 rounded-lg bg-orbit-navy">
                        <span className="text-sm text-orbit-light">{i.title}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant={i.priority === 'high' || i.priority === 'critical' ? 'red' : i.priority === 'medium' ? 'amber' : 'blue'}>{i.priority}</Badge>
                          <Badge variant={i.status === 'done' ? 'green' : i.status === 'in_progress' ? 'blue' : 'slate'}>{i.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Quarter Tab */}
      {tab === 'quarter' && (
        <>
          <select className="input max-w-xs" value={selectedQuarter} onChange={(e) => setSelectedQuarter(e.target.value)}>
            <option value="">Select a quarter...</option>
            {quarters?.map((q) => <option key={q.id} value={q.id}>{q.name}</option>)}
          </select>

          {quarterReport && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard title="Initiatives" value={quarterReport.totalInitiatives} accentColor="blue" />
                <MetricCard title="Work Items" value={quarterReport.totalWorkItems} accentColor="purple" />
                <MetricCard title="Completed" value={quarterReport.completedWorkItems} accentColor="green" />
                <MetricCard title="Progress" value={`${quarterReport.overallProgress}%`} accentColor="amber" />
              </div>

              <div className="card">
                <h3 className="text-lg font-semibold text-orbit-light mb-4">Initiatives Progress</h3>
                <div className="space-y-4">
                  {quarterReport.initiatives?.map((init: any) => (
                    <div key={init.id} className="p-4 rounded-lg bg-orbit-navy">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-orbit-light">{init.title}</span>
                          {init.team && (
                            <span className="text-xs text-orbit-slate">({init.team.name})</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={init.priority === 'high' || init.priority === 'critical' ? 'red' : init.priority === 'medium' ? 'amber' : 'blue'}>{init.priority}</Badge>
                          <span className="text-xs font-medium text-orbit-light">{init.progress}%</span>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-orbit-card rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${init.progress}%`,
                            background: init.progress >= 75 ? '#10B981' : init.progress >= 40 ? '#2563EB' : '#F59E0B',
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-orbit-slate">{init.completedItems} / {init.totalItems} items</span>
                        <Badge variant={init.status === 'done' ? 'green' : init.status === 'in_progress' ? 'blue' : 'slate'}>{init.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default ReportsPage;
