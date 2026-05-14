import React, { useState } from 'react';
import { TrendingUp, Users, Zap, Target, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { useApi } from '@/hooks/useApi';
import { capacity } from '@/api/services';
import { useTeam } from '@/context/TeamContext';
import Spinner from '@/components/common/Spinner';
import ErrorState from '@/components/common/ErrorState';
import EmptyState from '@/components/common/EmptyState';

const SPRINT_COUNT_OPTIONS = [3, 6, 9, 12];

interface VelocityData {
  teamId: string;
  sprintCount: number;
  avgVelocity: number;
  committedSP: number;
  activeSprint: string | null;
  capacityDelta: number;
  sprintVelocity: Array<{ sprint: string; storyPoints: number; itemCount: number }>;
  memberVelocity: Array<{ name: string; totalSP: number; avgSPPerSprint: number }>;
}

const CapacityPage: React.FC = () => {
  const { selectedTeamId, selectedTeam } = useTeam();
  const [sprintCount, setSprintCount] = useState(6);

  const { data, loading, error, refetch } = useApi<VelocityData>(
    () => selectedTeamId ? capacity.getTeamVelocity(selectedTeamId, sprintCount) : Promise.resolve(null),
    [selectedTeamId, sprintCount]
  );

  if (!selectedTeamId) {
    return <EmptyState title="Select a team" description="Choose a team from the top selector to view velocity-based capacity." />;
  }

  if (loading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (!data) return <EmptyState title="No velocity data" description="Sync Jira data and ensure team members have sprint work items." />;

  const isOverCapacity = data.capacityDelta < 0;
  const capacityPercent = data.avgVelocity > 0
    ? Math.round((data.committedSP / data.avgVelocity) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-orbit-slate mt-1">
            Velocity-based capacity for {selectedTeam?.name || 'team'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-orbit-slate">Sprints for velocity:</label>
          <select
            className="input w-20"
            value={sprintCount}
            onChange={(e) => setSprintCount(Number(e.target.value))}
          >
            {SPRINT_COUNT_OPTIONS.map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-orbit-blue" />
            <p className="text-sm text-orbit-slate">Avg Velocity</p>
          </div>
          <p className="text-2xl font-bold text-orbit-blue">{data.avgVelocity} SP</p>
          <p className="text-xs text-orbit-slate mt-1">per sprint (last {data.sprintCount})</p>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-orbit-purple" />
            <p className="text-sm text-orbit-slate">Committed</p>
          </div>
          <p className="text-2xl font-bold text-orbit-purple">{data.committedSP} SP</p>
          <p className="text-xs text-orbit-slate mt-1">
            {data.activeSprint ? `in ${data.activeSprint}` : 'current sprint'}
          </p>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-orbit-green" />
            <p className="text-sm text-orbit-slate">Capacity Delta</p>
          </div>
          <p className={`text-2xl font-bold ${isOverCapacity ? 'text-red-400' : 'text-emerald-400'}`}>
            {isOverCapacity ? '' : '+'}{data.capacityDelta} SP
          </p>
          <p className="text-xs text-orbit-slate mt-1">
            {isOverCapacity ? 'over capacity' : 'under capacity'}
          </p>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 mb-1">
            {isOverCapacity ? <AlertTriangle className="w-4 h-4 text-red-400" /> : <Users className="w-4 h-4 text-emerald-400" />}
            <p className="text-sm text-orbit-slate">Utilization</p>
          </div>
          <p className={`text-2xl font-bold ${capacityPercent > 100 ? 'text-red-400' : capacityPercent > 85 ? 'text-orbit-amber' : 'text-emerald-400'}`}>
            {capacityPercent}%
          </p>
          <p className="text-xs text-orbit-slate mt-1">committed vs velocity</p>
        </div>
      </div>

      {/* Velocity Trend Chart */}
      <div className="card">
        <h3 className="text-lg font-semibold text-orbit-light mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-orbit-blue" />
          Velocity Trend
        </h3>
        {data.sprintVelocity.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.sprintVelocity} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
              <XAxis
                dataKey="sprint"
                tick={{ fill: '#94A3B8', fontSize: 11 }}
                angle={-30}
                textAnchor="end"
                height={60}
                tickFormatter={(v: string) => v.replace(/^BV BO\s*(Sprint\s*)?/i, '').replace(/^VBO[\s-]*/i, 'VBO ')}
              />
              <YAxis tick={{ fill: '#94A3B8', fontSize: 12 }} label={{ value: 'Story Points', angle: -90, position: 'insideLeft', fill: '#94A3B8', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '8px' }}
                labelStyle={{ color: '#F1F5F9' }}
                itemStyle={{ color: '#94A3B8' }}
                formatter={(value: number, name: string) => [value, name === 'storyPoints' ? 'Story Points' : name]}
              />
              <ReferenceLine y={data.avgVelocity} stroke="#F59E0B" strokeDasharray="5 5" label={{ value: `Avg: ${data.avgVelocity}`, fill: '#F59E0B', fontSize: 11, position: 'right' }} />
              <Bar dataKey="storyPoints" fill="url(#velocityGradient)" radius={[4, 4, 0, 0]} />
              <defs>
                <linearGradient id="velocityGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" />
                  <stop offset="100%" stopColor="#8B5CF6" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-orbit-slate py-8 text-center">No sprint velocity data available.</p>
        )}
      </div>

      {/* Member Velocity Table */}
      {data.memberVelocity.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-orbit-light mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-orbit-purple" />
            Member Velocity (last {data.sprintCount} sprints)
          </h3>
          <div className="overflow-x-auto rounded-xl border border-orbit-navy-lighter/50">
            <table className="w-full">
              <thead className="bg-orbit-navy-light">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-orbit-slate uppercase">Member</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-orbit-slate uppercase">Total SP</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-orbit-slate uppercase">Avg SP/Sprint</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-orbit-slate uppercase">Contribution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-orbit-navy-lighter/30">
                {data.memberVelocity.map((m) => {
                  const maxSP = data.memberVelocity[0]?.totalSP || 1;
                  const barWidth = Math.round((m.totalSP / maxSP) * 100);
                  return (
                    <tr key={m.name} className="hover:bg-orbit-navy-light/50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-orbit-light">{m.name}</td>
                      <td className="px-4 py-3 text-sm text-orbit-slate text-right">{m.totalSP}</td>
                      <td className="px-4 py-3 text-sm text-orbit-slate text-right">{m.avgSPPerSprint}</td>
                      <td className="px-4 py-3">
                        <div className="w-full h-2 bg-orbit-navy rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-orbit-blue to-orbit-purple"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default CapacityPage;
