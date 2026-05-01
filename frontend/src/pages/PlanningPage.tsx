import React, { useState, useEffect } from 'react';
import { ExternalLink, AlertTriangle, Layers, RefreshCw } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { planning } from '@/api/services';
import Badge from '@/components/common/Badge';
import Spinner from '@/components/common/Spinner';
import ErrorState from '@/components/common/ErrorState';
import EmptyState from '@/components/common/EmptyState';
import type { EpicPlan, QuarterImpact } from '@/types';

const sizeColor = (size: string | null): string => {
  switch (size?.toUpperCase()) {
    case 'XS': return 'bg-slate-500/20 text-slate-300';
    case 'S': return 'bg-emerald-500/20 text-emerald-300';
    case 'M': return 'bg-blue-500/20 text-blue-300';
    case 'L': return 'bg-amber-500/20 text-amber-300';
    case 'XL': return 'bg-orange-500/20 text-orange-300';
    case 'XXL': return 'bg-red-500/20 text-red-300';
    default: return 'bg-slate-700/40 text-slate-400';
  }
};

const statusVariant = (s: string): 'green' | 'blue' | 'red' | 'slate' => {
  const l = s?.toLowerCase() || '';
  if (l === 'done') return 'green';
  if (l === 'in_progress' || l === 'in_review') return 'blue';
  if (l.includes('risk') || l.includes('block')) return 'red';
  return 'slate';
};

const PlanningPage: React.FC = () => {
  const { data: quarters, loading, error, refetch } = useApi<string[]>(() => planning.getEpicQuarters());
  const [selectedQuarter, setSelectedQuarter] = useState<string>('');

  useEffect(() => {
    if (quarters?.length && !selectedQuarter) {
      setSelectedQuarter(quarters[0]);
    }
  }, [quarters, selectedQuarter]);

  const { data: epics, loading: epicsLoading, refetch: refetchEpics } = useApi<EpicPlan[]>(
    () => selectedQuarter ? planning.getEpicsByQuarter(selectedQuarter) : Promise.resolve([]),
    [selectedQuarter]
  );

  const { data: impact, refetch: refetchImpact } = useApi<QuarterImpact | null>(
    () => selectedQuarter ? planning.getQuarterImpact(selectedQuarter) : Promise.resolve(null),
    [selectedQuarter]
  );

  const handleRefresh = () => {
    refetch();
    refetchEpics();
    refetchImpact();
  };

  if (loading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const epicList: EpicPlan[] = epics || [];
  const totalSp = impact?.totalEstimatedSp || 0;
  const unsizedCount = impact?.unsizedCount || 0;
  const completedCount = epicList.filter((e) => e.status === 'done').length;
  const completionPct = epicList.length > 0 ? Math.round((completedCount / epicList.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-orbit-light">Planning</h2>
          <p className="text-sm text-orbit-slate mt-1">Epics by quarter, sized via t-shirt mapping</p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-orbit-navy-lighter text-orbit-slate hover:text-orbit-light transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {(!quarters || quarters.length === 0) ? (
        <EmptyState
          title="No epics with a quarter found"
          description="Configure the Jira field mapping in Settings (Quarter custom field) and run Jira Sync. Epics with a quarter assigned will appear here."
        />
      ) : (
        <>
          {/* Quarter selector */}
          <div className="flex items-center gap-2 flex-wrap">
            {quarters.map((q) => (
              <button
                key={q}
                onClick={() => setSelectedQuarter(q)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedQuarter === q
                    ? 'bg-gradient-brand text-white shadow-glow-blue'
                    : 'bg-orbit-navy-lighter text-orbit-slate hover:text-orbit-light'
                }`}
              >
                {q}
              </button>
            ))}
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card">
              <p className="text-sm text-orbit-slate">Epics</p>
              <p className="text-2xl font-bold text-orbit-blue">{epicList.length}</p>
            </div>
            <div className="card">
              <p className="text-sm text-orbit-slate">Estimated Effort</p>
              <p className="text-2xl font-bold text-orbit-purple">{totalSp} SP</p>
              {unsizedCount > 0 && (
                <p className="text-xs text-orbit-amber mt-1">{unsizedCount} epic(s) without t-shirt size</p>
              )}
            </div>
            <div className="card">
              <p className="text-sm text-orbit-slate">Done</p>
              <p className="text-2xl font-bold text-orbit-green">{completedCount} / {epicList.length}</p>
            </div>
            <div className="card">
              <p className="text-sm text-orbit-slate">Progress</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-3 bg-orbit-navy rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-brand rounded-full transition-all" style={{ width: `${completionPct}%` }} />
                </div>
                <span className="text-sm font-bold text-orbit-light">{completionPct}%</span>
              </div>
            </div>
          </div>

          {/* Capacity Impact by Team */}
          {impact && impact.teams.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold text-orbit-light mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orbit-amber" />
                Capacity Impact by Team
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {impact.teams.map((t) => (
                  <div key={t.teamId} className="flex items-center justify-between p-3 rounded-lg bg-orbit-navy">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color || '#64748B' }} />
                      <div>
                        <span className="text-sm text-orbit-light">{t.teamName}</span>
                        <p className="text-xs text-orbit-slate">{t.epicCount} epic(s){t.unsizedCount > 0 ? ` · ${t.unsizedCount} unsized` : ''}</p>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-orbit-blue">{t.estimatedSp} SP</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Epics table */}
          {epicsLoading ? (
            <div className="flex justify-center py-12"><Spinner size="lg" /></div>
          ) : epicList.length > 0 ? (
            <div className="card">
              <h3 className="text-lg font-semibold text-orbit-light mb-4 flex items-center gap-2">
                <Layers className="w-5 h-5 text-orbit-blue" />
                Epics — {selectedQuarter}
              </h3>
              <div className="overflow-x-auto rounded-xl border border-orbit-navy-lighter/50">
                <table className="w-full">
                  <thead className="bg-orbit-navy-light">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-orbit-slate uppercase">Key</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-orbit-slate uppercase">Summary</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-orbit-slate uppercase">Team</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-orbit-slate uppercase">Size</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-orbit-slate uppercase">SP</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-orbit-slate uppercase">Children</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-orbit-slate uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-orbit-navy-lighter/30">
                    {epicList.map((e) => {
                      const childPct = e.children.total > 0 ? Math.round((e.children.done / e.children.total) * 100) : 0;
                      return (
                        <tr key={e.id} className="hover:bg-orbit-navy-light/50 transition-colors">
                          <td className="px-4 py-3">
                            {e.externalUrl ? (
                              <a href={e.externalUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-orbit-blue hover:underline inline-flex items-center gap-1">
                                {e.key}<ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span className="text-sm text-orbit-light">{e.key}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 max-w-md">
                            <span className="text-sm text-orbit-light">{e.title}</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-orbit-slate">{e.team?.name || '—'}</td>
                          <td className="px-4 py-3">
                            {e.tShirtSize ? (
                              <span className={`px-2 py-0.5 rounded text-xs font-bold ${sizeColor(e.tShirtSize)}`}>{e.tShirtSize}</span>
                            ) : (
                              <span className="text-xs text-orbit-amber">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-orbit-slate">
                            {e.sizedStoryPoints != null ? `${e.sizedStoryPoints}` : '—'}
                          </td>
                          <td className="px-4 py-3">
                            {e.children.total > 0 ? (
                              <div className="flex items-center gap-2 min-w-[140px]">
                                <div className="flex-1 h-1.5 bg-orbit-navy rounded-full overflow-hidden">
                                  <div className="h-full bg-gradient-brand" style={{ width: `${childPct}%` }} />
                                </div>
                                <span className="text-xs text-orbit-slate whitespace-nowrap">{e.children.done}/{e.children.total}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-orbit-slate">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3"><Badge variant={statusVariant(e.status)}>{e.status}</Badge></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <EmptyState title="No epics in this quarter" description="Try a different quarter or run Jira sync to refresh data." />
          )}
        </>
      )}
    </div>
  );
};

export default PlanningPage;
