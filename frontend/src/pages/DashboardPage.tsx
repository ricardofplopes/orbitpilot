import React from 'react';
import { Activity, Target, AlertTriangle, Clock } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { dashboard } from '@/api/services';
import MetricCard from '@/components/cards/MetricCard';
import InsightCard from '@/components/cards/InsightCard';
import CapacityChart from '@/components/charts/CapacityChart';
import Badge from '@/components/common/Badge';
import Spinner from '@/components/common/Spinner';
import ErrorState from '@/components/common/ErrorState';
import type { DashboardData } from '@/types';

const DashboardPage: React.FC = () => {
  const { data, loading, error, refetch } = useApi<DashboardData>(() => dashboard.getDashboard());

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
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return <ErrorState message={error || 'Failed to load dashboard'} onRetry={refetch} />;
  }

  const priorityVariant = (p: string) => {
    switch (p.toLowerCase()) {
      case 'critical': return 'red' as const;
      case 'high': return 'amber' as const;
      case 'medium': return 'blue' as const;
      default: return 'slate' as const;
    }
  };

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Team Capacity"
          value={`${data.teamCapacityPercent}%`}
          subtitle="On track"
          accentColor={data.teamCapacityPercent >= 70 ? 'green' : data.teamCapacityPercent >= 50 ? 'amber' : 'red'}
          trend="up"
          trendValue="+5%"
        />
        <MetricCard
          title="Committed Work"
          value={data.committedWork}
          subtitle="Items this quarter"
          accentColor="purple"
        />
        <MetricCard
          title="At Risk"
          value={data.atRiskWork}
          subtitle="Need attention"
          accentColor={data.atRiskWork > 5 ? 'red' : 'amber'}
        />
        <MetricCard
          title="Cycle Time"
          value={`${data.avgCycleTime}d`}
          subtitle="Average days"
          accentColor="blue"
          trend="down"
          trendValue="-0.3d"
        />
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Capacity by Team */}
        <div className="card">
          <h3 className="text-lg font-semibold text-orbit-light mb-4">Capacity by Team</h3>
          {data.capacityByTeam.length > 0 ? (
            <CapacityChart data={data.capacityByTeam} />
          ) : (
            <p className="text-sm text-orbit-slate py-8 text-center">No team data available</p>
          )}
        </div>

        {/* Top Priorities */}
        <div className="card">
          <h3 className="text-lg font-semibold text-orbit-light mb-4">Top Priorities</h3>
          <div className="space-y-3">
            {data.topPriorities.length > 0 ? (
              data.topPriorities.slice(0, 8).map((init) => (
                <div
                  key={init.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-orbit-navy hover:bg-orbit-navy-lighter/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-orbit-light truncate">{init.title}</p>
                    <p className="text-xs text-orbit-slate">{init.team?.name || 'Unassigned'}</p>
                  </div>
                  <Badge variant={priorityVariant(init.priority)}>{init.priority}</Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-orbit-slate py-8 text-center">No priorities set</p>
            )}
          </div>
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
            {data.insights.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
