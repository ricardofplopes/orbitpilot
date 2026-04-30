import React from 'react';
import { Activity, Target, AlertTriangle, Clock, CheckCircle2, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useApi } from '@/hooks/useApi';
import { dashboard } from '@/api/services';
import { useTeam } from '@/context/TeamContext';
import MetricCard from '@/components/cards/MetricCard';
import InsightCard from '@/components/cards/InsightCard';
import Badge from '@/components/common/Badge';
import Spinner from '@/components/common/Spinner';
import ErrorState from '@/components/common/ErrorState';
import EmptyState from '@/components/common/EmptyState';

const DashboardPage: React.FC = () => {
  const { selectedTeamId, selectedTeam } = useTeam();
  const { data, loading, error, refetch } = useApi<any>(
    () => dashboard.getDashboard(selectedTeamId || undefined),
    [selectedTeamId]
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card animate-pulse h-28">
              <div className="h-3 bg-orbit-navy-lighter rounded w-24 mb-3" />
              <div className="h-8 bg-orbit-navy-lighter rounded w-16" />
            </div>
          ))}
        </div>
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      </div>
    );
  }

  if (error || !data) {
    return <ErrorState message={error || 'Failed to load dashboard'} onRetry={refetch} />;
  }

  if (!selectedTeamId) {
    return <EmptyState title="No team selected" description="Select a team from the top bar to view dashboard data" />;
  }

  return (
    <div className="space-y-6">
      {/* Team name */}
      <div>
        <p className="text-sm text-orbit-slate">Dashboard for</p>
        <h2 className="text-2xl font-bold text-orbit-light">{selectedTeam?.name || 'Team'}</h2>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Active Work"
          value={data.committedWork}
          subtitle="In progress / todo"
          accentColor="purple"
        />
        <MetricCard
          title="At Risk"
          value={data.atRiskWork}
          subtitle="High priority"
          accentColor={data.atRiskWork > 5 ? 'red' : 'amber'}
        />
        <MetricCard
          title="Done"
          value={data.doneWork}
          subtitle="Completed items"
          accentColor="green"
        />
        <MetricCard
          title="Cycle Time"
          value={data.avgCycleTime ? `${data.avgCycleTime}d` : '—'}
          subtitle="Avg days to complete"
          accentColor="blue"
        />
        <MetricCard
          title="SP Delivered"
          value={data.totalSpDelivered || data.totalItemsDelivered || 0}
          subtitle={data.totalSpDelivered ? "Story points done" : "Items delivered"}
          accentColor="purple"
        />
      </div>

      {/* Work by Status */}
      <div className="card">
        <h3 className="text-lg font-semibold text-orbit-light mb-4">Work by Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {Object.entries(data.workByStatus || {}).map(([status, count]) => (
            <div key={status} className="text-center p-3 rounded-lg bg-orbit-navy">
              <p className="text-2xl font-bold text-orbit-light">{count as number}</p>
              <p className="text-xs text-orbit-slate capitalize mt-1">{status.replace('_', ' ')}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sprint Velocity */}
        <div className="card">
          <h3 className="text-lg font-semibold text-orbit-light mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-orbit-blue" />
            Sprint Velocity
          </h3>
          {data.velocity && data.velocity.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.velocity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="sprint"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  angle={-20}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#f8fafc' }}
                />
                <Bar dataKey="itemCount" fill="#818cf8" radius={[4, 4, 0, 0]} name="Items Delivered" />
                <Bar dataKey="storyPoints" fill="#6366f1" radius={[4, 4, 0, 0]} name="Story Points" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-orbit-slate py-8 text-center">No sprint data available yet. Sync issues from Jira to populate sprint velocity.</p>
          )}
        </div>

        {/* Team Members Workload */}
        <div className="card">
          <h3 className="text-lg font-semibold text-orbit-light mb-4">Member Workload</h3>
          {data.members && data.members.length > 0 ? (
            <div className="space-y-2 max-h-[280px] overflow-y-auto">
              {data.members.map((m: any) => (
                <div key={m.name} className="flex items-center justify-between p-2.5 rounded-lg bg-orbit-navy hover:bg-orbit-navy-lighter/50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-white">{m.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}</span>
                    </div>
                    <span className="text-sm text-orbit-light truncate">{m.name}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge variant="blue">{m.activeItems} items</Badge>
                    <span className="text-xs text-orbit-slate">{m.storyPoints} SP</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-orbit-slate py-8 text-center">No active member data</p>
          )}
        </div>
      </div>

      {/* Insights */}
      {data.insights && data.insights.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-orbit-light mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-orbit-blue" />
            OrbitPilot Insights
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.insights.map((insight: any) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
