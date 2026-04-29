import React, { useState } from 'react';
import { Plus, Calendar, Trash2, AlertTriangle, Pencil } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { planning, teams as teamsApi } from '@/api/services';
import Modal from '@/components/common/Modal';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Badge from '@/components/common/Badge';
import Spinner from '@/components/common/Spinner';
import ErrorState from '@/components/common/ErrorState';
import EmptyState from '@/components/common/EmptyState';
import type { QuarterPlan, Initiative, Team } from '@/types';

const statusVariant = (s: string) => {
  switch (s?.toLowerCase()) {
    case 'done': case 'completed': return 'green' as const;
    case 'in_progress': case 'in-progress': return 'blue' as const;
    case 'at_risk': return 'red' as const;
    default: return 'slate' as const;
  }
};

const priorityVariant = (p: string) => {
  switch (p) {
    case 'P1': return 'red' as const;
    case 'P2': return 'amber' as const;
    case 'P3': return 'blue' as const;
    default: return 'slate' as const;
  }
};

const PlanningPage: React.FC = () => {
  const { data: quarters, loading, error, refetch } = useApi<QuarterPlan[]>(() => planning.getQuarters());
  const { data: teamsList } = useApi<Team[]>(() => teamsApi.getTeams());
  const [selectedQuarter, setSelectedQuarter] = useState<string>('');
  const { data: quarterDetail, refetch: refetchDetail } = useApi<QuarterPlan | null>(
    () => selectedQuarter ? planning.getQuarter(selectedQuarter) : Promise.resolve(null),
    [selectedQuarter]
  );

  const [showQuarterModal, setShowQuarterModal] = useState(false);
  const [showInitiativeModal, setShowInitiativeModal] = useState(false);
  const [editingInit, setEditingInit] = useState<Initiative | null>(null);
  const [quarterForm, setQuarterForm] = useState({ name: '', startDate: '', endDate: '' });
  const [initForm, setInitForm] = useState({ title: '', description: '', teamId: '', priority: 'P2', estimatedEffort: 0, status: 'planned' });
  const [saving, setSaving] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  // Auto-select first quarter
  React.useEffect(() => {
    if (quarters?.length && !selectedQuarter) {
      setSelectedQuarter(quarters[0].id);
    }
  }, [quarters, selectedQuarter]);

  const handleCreateQuarter = async () => {
    setSaving(true);
    setMutationError(null);
    try {
      const q = await planning.createQuarter(quarterForm);
      setShowQuarterModal(false);
      setQuarterForm({ name: '', startDate: '', endDate: '' });
      refetch();
      setSelectedQuarter(q.id);
    } catch (err: any) {
      setMutationError(err?.response?.data?.message || 'Failed to create quarter');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateInitiative = async () => {
    if (!selectedQuarter) return;
    setSaving(true);
    setMutationError(null);
    try {
      await planning.createInitiative(selectedQuarter, initForm);
      setShowInitiativeModal(false);
      setInitForm({ title: '', description: '', teamId: '', priority: 'P2', estimatedEffort: 0, status: 'planned' });
      refetchDetail();
    } catch (err: any) {
      setMutationError(err?.response?.data?.message || 'Failed to create initiative');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateInitiative = async () => {
    if (!editingInit) return;
    setSaving(true);
    setMutationError(null);
    try {
      await planning.updateInitiative(editingInit.id, initForm);
      setEditingInit(null);
      refetchDetail();
    } catch (err: any) {
      setMutationError(err?.response?.data?.message || 'Failed to update initiative');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteInitiative = async (id: string) => {
    if (!confirm('Delete this initiative? This cannot be undone.')) return;
    try {
      await planning.deleteInitiative(id);
      refetchDetail();
    } catch (err: any) {
      setMutationError(err?.response?.data?.message || 'Failed to delete initiative');
    }
  };

  const openEditInitiative = (init: Initiative) => {
    setEditingInit(init);
    setInitForm({
      title: init.title,
      description: init.description || '',
      teamId: init.teamId || '',
      priority: init.priority,
      estimatedEffort: init.estimatedEffort || 0,
      status: init.status,
    });
  };

  if (loading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const initiatives: Initiative[] = quarterDetail?.initiatives || [];
  const totalEffort = initiatives.reduce((s, i) => s + (i.estimatedEffort || 0), 0);
  const completedCount = initiatives.filter((i) => i.status === 'done' || i.status === 'completed').length;

  // Capacity impact: group effort by team
  const effortByTeam: Record<string, { name: string; effort: number; color?: string }> = {};
  initiatives.forEach((i) => {
    const teamId = i.teamId || 'unassigned';
    const teamName = i.team?.name || 'Unassigned';
    if (!effortByTeam[teamId]) effortByTeam[teamId] = { name: teamName, effort: 0, color: (teamsList?.find((t) => t.id === teamId))?.color };
    effortByTeam[teamId].effort += i.estimatedEffort || 0;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-orbit-light">Planning</h2>
          <p className="text-sm text-orbit-slate mt-1">Manage quarterly plans and initiatives</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => setShowQuarterModal(true)}>
            <Calendar className="w-4 h-4" /> New Quarter
          </Button>
          <Button onClick={() => { setInitForm({ title: '', description: '', teamId: '', priority: 'P2', estimatedEffort: 0, status: 'planned' }); setShowInitiativeModal(true); }} disabled={!selectedQuarter}>
            <Plus className="w-4 h-4" /> Add Initiative
          </Button>
        </div>
      </div>

      {/* Quarter Selector */}
      {quarters && quarters.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {quarters.map((q) => (
            <button
              key={q.id}
              onClick={() => setSelectedQuarter(q.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedQuarter === q.id
                  ? 'bg-gradient-brand text-white shadow-glow-blue'
                  : 'bg-orbit-navy-lighter text-orbit-slate hover:text-orbit-light'
              }`}
            >
              {q.name}
              {q.status && <span className="ml-2 text-xs opacity-70">({q.status})</span>}
            </button>
          ))}
        </div>
      )}

      {mutationError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center justify-between">
          <span className="text-sm text-red-400">{mutationError}</span>
          <button onClick={() => setMutationError(null)} className="text-red-400 hover:text-red-300 text-sm">✕</button>
        </div>
      )}

      {/* Capacity Impact Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-sm text-orbit-slate">Initiatives</p>
          <p className="text-2xl font-bold text-orbit-blue">{initiatives.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-orbit-slate">Total Effort</p>
          <p className="text-2xl font-bold text-orbit-purple">{totalEffort} pts</p>
        </div>
        <div className="card">
          <p className="text-sm text-orbit-slate">Completed</p>
          <p className="text-2xl font-bold text-orbit-green">{completedCount} / {initiatives.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-orbit-slate">Progress</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-3 bg-orbit-navy rounded-full overflow-hidden">
              <div className="h-full bg-gradient-brand rounded-full transition-all" style={{ width: `${initiatives.length > 0 ? (completedCount / initiatives.length) * 100 : 0}%` }} />
            </div>
            <span className="text-sm font-bold text-orbit-light">{initiatives.length > 0 ? Math.round((completedCount / initiatives.length) * 100) : 0}%</span>
          </div>
        </div>
      </div>

      {/* Effort by Team (capacity impact) */}
      {Object.keys(effortByTeam).length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-orbit-light mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orbit-amber" />
            Capacity Impact by Team
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.values(effortByTeam).map((t) => (
              <div key={t.name} className="flex items-center justify-between p-3 rounded-lg bg-orbit-navy">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color || '#64748B' }} />
                  <span className="text-sm text-orbit-light">{t.name}</span>
                </div>
                <span className="text-sm font-medium text-orbit-blue">{t.effort} pts</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Initiatives Table */}
      {initiatives.length > 0 ? (
        <div className="card">
          <h3 className="text-lg font-semibold text-orbit-light mb-4">Initiatives</h3>
          <div className="overflow-x-auto rounded-xl border border-orbit-navy-lighter/50">
            <table className="w-full">
              <thead className="bg-orbit-navy-light">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-orbit-slate uppercase">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-orbit-slate uppercase">Team</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-orbit-slate uppercase">Priority</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-orbit-slate uppercase">Effort</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-orbit-slate uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-orbit-slate uppercase w-16">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-orbit-navy-lighter/30">
                {initiatives.map((init) => (
                  <tr key={init.id} className="hover:bg-orbit-navy-light/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-orbit-light">{init.title}</span>
                      {init.description && <p className="text-xs text-orbit-slate mt-0.5 truncate max-w-xs">{init.description}</p>}
                    </td>
                    <td className="px-4 py-3 text-sm text-orbit-slate">{init.team?.name || '—'}</td>
                    <td className="px-4 py-3"><Badge variant={priorityVariant(init.priority)}>{init.priority}</Badge></td>
                    <td className="px-4 py-3 text-sm text-orbit-slate">{init.estimatedEffort || '—'} pts</td>
                    <td className="px-4 py-3"><Badge variant={statusVariant(init.status)}>{init.status}</Badge></td>
                    <td className="px-4 py-3">
                      <button onClick={() => openEditInitiative(init)} className="p-1.5 rounded hover:bg-orbit-navy-lighter transition-colors" title="Edit">
                        <svg className="w-3.5 h-3.5 text-orbit-slate hover:text-orbit-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState
          title="No initiatives yet"
          description="Create your first initiative for this quarter"
          actionLabel="Add Initiative"
          onAction={() => setShowInitiativeModal(true)}
        />
      )}

      {/* Create Quarter Modal */}
      <Modal isOpen={showQuarterModal} onClose={() => setShowQuarterModal(false)} title="Create Quarter Plan">
        <div className="space-y-4">
          <Input label="Name" placeholder="Q3 2026" value={quarterForm.name} onChange={(e) => setQuarterForm({ ...quarterForm, name: e.target.value })} />
          <Input label="Start Date" type="date" value={quarterForm.startDate} onChange={(e) => setQuarterForm({ ...quarterForm, startDate: e.target.value })} />
          <Input label="End Date" type="date" value={quarterForm.endDate} onChange={(e) => setQuarterForm({ ...quarterForm, endDate: e.target.value })} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowQuarterModal(false)}>Cancel</Button>
            <Button onClick={handleCreateQuarter} loading={saving}>Create</Button>
          </div>
        </div>
      </Modal>

      {/* Create Initiative Modal */}
      <Modal isOpen={showInitiativeModal} onClose={() => setShowInitiativeModal(false)} title="Add Initiative">
        <div className="space-y-4">
          <Input label="Title" placeholder="Initiative title" value={initForm.title} onChange={(e) => setInitForm({ ...initForm, title: e.target.value })} />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-orbit-slate">Description</label>
            <textarea className="input min-h-[80px] resize-none" placeholder="Describe the initiative..." value={initForm.description} onChange={(e) => setInitForm({ ...initForm, description: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-orbit-slate">Team</label>
            <select className="input" value={initForm.teamId} onChange={(e) => setInitForm({ ...initForm, teamId: e.target.value })}>
              <option value="">Select team</option>
              {teamsList?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-orbit-slate">Priority</label>
              <select className="input" value={initForm.priority} onChange={(e) => setInitForm({ ...initForm, priority: e.target.value })}>
                <option value="P1">P1 - Critical</option>
                <option value="P2">P2 - Standard</option>
                <option value="P3">P3 - Low</option>
              </select>
            </div>
            <Input label="Estimated Effort (pts)" type="number" value={String(initForm.estimatedEffort)} onChange={(e) => setInitForm({ ...initForm, estimatedEffort: Number(e.target.value) })} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowInitiativeModal(false)}>Cancel</Button>
            <Button onClick={handleCreateInitiative} loading={saving} disabled={!initForm.title.trim()}>Create</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Initiative Modal */}
      <Modal isOpen={!!editingInit} onClose={() => setEditingInit(null)} title="Edit Initiative">
        <div className="space-y-4">
          <Input label="Title" placeholder="Initiative title" value={initForm.title} onChange={(e) => setInitForm({ ...initForm, title: e.target.value })} />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-orbit-slate">Description</label>
            <textarea className="input min-h-[80px] resize-none" placeholder="Describe the initiative..." value={initForm.description} onChange={(e) => setInitForm({ ...initForm, description: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-orbit-slate">Team</label>
            <select className="input" value={initForm.teamId} onChange={(e) => setInitForm({ ...initForm, teamId: e.target.value })}>
              <option value="">Select team</option>
              {teamsList?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-orbit-slate">Priority</label>
              <select className="input" value={initForm.priority} onChange={(e) => setInitForm({ ...initForm, priority: e.target.value })}>
                <option value="P1">P1 - Critical</option>
                <option value="P2">P2 - Standard</option>
                <option value="P3">P3 - Low</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-orbit-slate">Status</label>
              <select className="input" value={initForm.status} onChange={(e) => setInitForm({ ...initForm, status: e.target.value })}>
                <option value="planned">Planned</option>
                <option value="in_progress">In Progress</option>
                <option value="at_risk">At Risk</option>
                <option value="done">Done</option>
              </select>
            </div>
            <Input label="Effort (pts)" type="number" value={String(initForm.estimatedEffort)} onChange={(e) => setInitForm({ ...initForm, estimatedEffort: Number(e.target.value) })} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setEditingInit(null)}>Cancel</Button>
            <Button onClick={handleUpdateInitiative} loading={saving}>Save Changes</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PlanningPage;
