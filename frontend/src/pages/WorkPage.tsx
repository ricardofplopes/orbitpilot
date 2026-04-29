import React, { useState } from 'react';
import { Plus, Search, ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { work, teams as teamsApi } from '@/api/services';
import Modal from '@/components/common/Modal';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Badge from '@/components/common/Badge';
import Spinner from '@/components/common/Spinner';
import ErrorState from '@/components/common/ErrorState';
import EmptyState from '@/components/common/EmptyState';
import type { WorkItem, Team } from '@/types';

const statusVariant = (s: string) => {
  switch (s.toLowerCase()) {
    case 'done': case 'completed': return 'green' as const;
    case 'in-progress': case 'in_progress': return 'blue' as const;
    case 'in-review': case 'in_review': return 'purple' as const;
    case 'blocked': return 'red' as const;
    case 'todo': return 'amber' as const;
    default: return 'slate' as const;
  }
};

const sourceIcon = (s: string) => {
  switch (s.toLowerCase()) {
    case 'jira': return '🔷';
    case 'github': return '🐙';
    default: return '📋';
  }
};

const WorkPage: React.FC = () => {
  const [filters, setFilters] = useState<{ teamId?: string; status?: string; source?: string }>({});
  const { data: items, loading, error, refetch } = useApi<WorkItem[]>(() => work.getWorkItems(filters), [filters.teamId, filters.status, filters.source]);
  const { data: teamsList } = useApi<Team[]>(() => teamsApi.getTeams());
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<WorkItem | null>(null);
  const [form, setForm] = useState({ title: '', description: '', status: 'todo', priority: 'P2', storyPoints: 0, teamId: '', assignee: '' });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const openCreate = () => {
    setForm({ title: '', description: '', status: 'todo', priority: 'P2', storyPoints: 0, teamId: '', assignee: '' });
    setShowCreate(true);
  };

  const openEdit = (item: WorkItem) => {
    setEditItem(item);
    setForm({
      title: item.title,
      description: item.description || '',
      status: item.status,
      priority: item.priority || 'medium',
      storyPoints: item.storyPoints || 0,
      teamId: item.teamId || '',
      assignee: item.assignee || '',
    });
  };

  const handleCreate = async () => {
    setSaving(true);
    try {
      await work.createWorkItem(form);
      setShowCreate(false);
      refetch();
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editItem) return;
    setSaving(true);
    try {
      await work.updateWorkItem(editItem.id, form);
      setEditItem(null);
      refetch();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this work item?')) return;
    await work.deleteWorkItem(id);
    refetch();
  };

  if (loading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const filtered = (items || []).filter((item) =>
    !search || item.title.toLowerCase().includes(search.toLowerCase())
  );

  const renderForm = (onSubmit: () => void, submitLabel: string) => (
    <div className="space-y-4">
      <Input label="Title" placeholder="Work item title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      <div className="space-y-1">
        <label className="block text-sm font-medium text-orbit-slate">Description</label>
        <textarea className="input min-h-[80px] resize-none" placeholder="Describe the work..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-orbit-slate">Status</label>
          <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="backlog">Backlog</option>
            <option value="todo">Todo</option>
            <option value="in-progress">In Progress</option>
            <option value="in-review">In Review</option>
            <option value="done">Done</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-orbit-slate">Priority</label>
          <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
            <option value="">None</option>
            <option value="P1">P1 - Critical</option>
            <option value="P2">P2 - Standard</option>
            <option value="P3">P3 - Low</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-orbit-slate">Team</label>
          <select className="input" value={form.teamId} onChange={(e) => setForm({ ...form, teamId: e.target.value })}>
            <option value="">None</option>
            {teamsList?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <Input label="Story Points" type="number" value={String(form.storyPoints)} onChange={(e) => setForm({ ...form, storyPoints: Number(e.target.value) })} />
      </div>
      <Input label="Assignee" placeholder="Assignee name" value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value })} />
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={() => { setShowCreate(false); setEditItem(null); }}>Cancel</Button>
        <Button onClick={onSubmit} loading={saving}>{submitLabel}</Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-orbit-light">Work Items</h2>
          <p className="text-sm text-orbit-slate mt-1">Track and manage all work across teams</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4" /> Create Work Item
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orbit-slate" />
          <input className="input pl-10" placeholder="Search work items..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input max-w-[180px]" value={filters.teamId || ''} onChange={(e) => setFilters({ ...filters, teamId: e.target.value || undefined })}>
          <option value="">All Teams</option>
          {teamsList?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select className="input max-w-[180px]" value={filters.status || ''} onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}>
          <option value="">All Statuses</option>
          <option value="backlog">Backlog</option>
          <option value="todo">Todo</option>
          <option value="in-progress">In Progress</option>
          <option value="in-review">In Review</option>
          <option value="done">Done</option>
          <option value="blocked">Blocked</option>
        </select>
        <select className="input max-w-[180px]" value={filters.source || ''} onChange={(e) => setFilters({ ...filters, source: e.target.value || undefined })}>
          <option value="">All Sources</option>
          <option value="manual">Manual</option>
          <option value="jira">Jira</option>
          <option value="github">GitHub</option>
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState title="No work items" description="Create a work item or sync from integrations" actionLabel="Create Work Item" onAction={openCreate} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-orbit-navy-lighter/50">
          <table className="w-full">
            <thead className="bg-orbit-navy-light">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-orbit-slate uppercase w-8" />
                <th className="px-4 py-3 text-left text-xs font-medium text-orbit-slate uppercase">Title</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-orbit-slate uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-orbit-slate uppercase">Priority</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-orbit-slate uppercase">Team</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-orbit-slate uppercase">Points</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-orbit-slate uppercase">Assignee</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-orbit-slate uppercase w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-orbit-navy-lighter/30">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-orbit-navy-light/50 transition-colors">
                  <td className="px-4 py-3 text-base">{sourceIcon(item.source)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-orbit-light">{item.title}</span>
                      {item.externalId && (
                        <span className="text-xs text-orbit-slate flex items-center gap-1">
                          {item.externalId} <ExternalLink className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3"><Badge variant={statusVariant(item.status)}>{item.status}</Badge></td>
                  <td className="px-4 py-3 text-sm text-orbit-slate capitalize">{item.priority || '—'}</td>
                  <td className="px-4 py-3 text-sm text-orbit-slate">{item.team?.name || '—'}</td>
                  <td className="px-4 py-3 text-sm text-orbit-slate">{item.storyPoints ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-orbit-slate">{item.assignee || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(item)} className="p-1.5 rounded hover:bg-orbit-navy-lighter transition-colors" title="Edit">
                        <Pencil className="w-3.5 h-3.5 text-orbit-slate hover:text-orbit-blue" />
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded hover:bg-red-500/20 transition-colors" title="Delete">
                        <Trash2 className="w-3.5 h-3.5 text-orbit-slate hover:text-red-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Work Item">
        {renderForm(handleCreate, 'Create')}
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editItem} onClose={() => setEditItem(null)} title="Edit Work Item">
        {renderForm(handleUpdate, 'Save Changes')}
      </Modal>
    </div>
  );
};

export default WorkPage;
