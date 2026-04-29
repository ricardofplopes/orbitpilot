import React, { useState } from 'react';
import { Plus, Users, Trash2 } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { teams as teamsApi, users as usersApi } from '@/api/services';
import TeamTable from '@/components/tables/TeamTable';
import Modal from '@/components/common/Modal';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Spinner from '@/components/common/Spinner';
import ErrorState from '@/components/common/ErrorState';
import EmptyState from '@/components/common/EmptyState';
import type { Team, User } from '@/types';

const TEAM_COLORS = ['#2563EB', '#7C3AED', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#8B5CF6'];

const TeamsPage: React.FC = () => {
  const { data: teamsList, loading, error, refetch } = useApi<Team[]>(() => teamsApi.getTeams());
  const { data: allUsers } = useApi<User[]>(() => usersApi.getAll());
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', color: TEAM_COLORS[0] });
  const [memberForm, setMemberForm] = useState({ userId: '', role: 'member', weeklyCapacity: 40 });
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    setSaving(true);
    try {
      await teamsApi.createTeam(form);
      setShowCreateModal(false);
      setForm({ name: '', description: '', color: TEAM_COLORS[0] });
      refetch();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this team?')) return;
    try {
      await teamsApi.deleteTeam(id);
      if (selectedTeam?.id === id) setSelectedTeam(null);
      refetch();
    } catch {
      // handled by client
    }
  };

  const handleAddMember = async () => {
    if (!selectedTeam) return;
    setSaving(true);
    try {
      await teamsApi.addMember(selectedTeam.id, memberForm);
      setShowMemberModal(false);
      setMemberForm({ userId: '', role: 'member', weeklyCapacity: 40 });
      refetch();
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!selectedTeam || !confirm('Remove this member from the team?')) return;
    try {
      await teamsApi.removeMember(selectedTeam.id, memberId);
      refetch();
    } catch {
      // handled by client
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  // Users already in the selected team
  const existingMemberIds = selectedTeam?.members?.map((m) => m.userId) || [];
  const availableUsers = allUsers?.filter((u) => !existingMemberIds.includes(u.id)) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-orbit-light">Teams</h2>
          <p className="text-sm text-orbit-slate mt-1">Manage your engineering teams</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4" /> Create Team
        </Button>
      </div>

      {!teamsList?.length ? (
        <EmptyState
          icon={<Users className="w-12 h-12" />}
          title="No teams yet"
          description="Create your first team to get started with capacity planning"
          actionLabel="Create Team"
          onAction={() => setShowCreateModal(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teamsList.map((team) => (
            <div
              key={team.id}
              onClick={() => setSelectedTeam(team)}
              className={`card cursor-pointer ${selectedTeam?.id === team.id ? 'glow-border' : ''}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.color || '#2563EB' }} />
                  <h3 className="font-semibold text-orbit-light">{team.name}</h3>
                </div>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(team.id); }} className="p-1 rounded hover:bg-red-500/20 transition-colors">
                  <Trash2 className="w-4 h-4 text-orbit-slate hover:text-red-400" />
                </button>
              </div>
              {team.description && <p className="text-xs text-orbit-slate mb-3">{team.description}</p>}
              <div className="flex items-center gap-2 text-sm text-orbit-slate">
                <Users className="w-4 h-4" />
                {team.members?.length || 0} members
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Team Detail */}
      {selectedTeam && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-orbit-light">{selectedTeam.name} — Members</h3>
            <Button variant="secondary" onClick={() => setShowMemberModal(true)}>
              <Plus className="w-4 h-4" /> Add Member
            </Button>
          </div>
          {selectedTeam.members?.length ? (
            <div className="overflow-x-auto rounded-xl border border-orbit-navy-lighter/50">
              <table className="w-full">
                <thead className="bg-orbit-navy-light">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-orbit-slate uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-orbit-slate uppercase">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-orbit-slate uppercase">Capacity</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-orbit-slate uppercase w-16">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-orbit-navy-lighter/30">
                  {selectedTeam.members.map((m) => (
                    <tr key={m.id} className="hover:bg-orbit-navy-light/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-gradient-brand flex items-center justify-center text-white text-xs font-bold">
                            {(m.user?.name || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <span className="text-sm font-medium text-orbit-light">{m.user?.name || m.userId}</span>
                            {m.user?.email && <p className="text-xs text-orbit-slate">{m.user.email}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-orbit-slate capitalize">{m.role}</td>
                      <td className="px-4 py-3 text-sm text-orbit-slate">{m.weeklyCapacity}h/week</td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleRemoveMember(m.id)} className="p-1.5 rounded hover:bg-red-500/20 transition-colors" title="Remove member">
                          <Trash2 className="w-3.5 h-3.5 text-orbit-slate hover:text-red-400" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-orbit-slate py-6 text-center">No members yet</p>
          )}
        </div>
      )}

      {/* Create Team Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Team">
        <div className="space-y-4">
          <Input label="Team Name" placeholder="Platform" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Description" placeholder="Optional description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-orbit-slate">Color</label>
            <div className="flex gap-2">
              {TEAM_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setForm({ ...form, color: c })}
                  className={`w-8 h-8 rounded-lg border-2 transition-all ${form.color === c ? 'border-white scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button onClick={handleCreate} loading={saving}>Create</Button>
          </div>
        </div>
      </Modal>

      {/* Add Member Modal */}
      <Modal isOpen={showMemberModal} onClose={() => setShowMemberModal(false)} title="Add Team Member">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-orbit-slate">Person</label>
            <select className="input" value={memberForm.userId} onChange={(e) => setMemberForm({ ...memberForm, userId: e.target.value })}>
              <option value="">Select a person...</option>
              {availableUsers.map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-orbit-slate">Role</label>
            <select className="input" value={memberForm.role} onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })}>
              <option value="member">Member</option>
              <option value="lead">Lead</option>
              <option value="manager">Manager</option>
            </select>
          </div>
          <Input label="Weekly Capacity (hours)" type="number" value={String(memberForm.weeklyCapacity)} onChange={(e) => setMemberForm({ ...memberForm, weeklyCapacity: Number(e.target.value) })} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowMemberModal(false)}>Cancel</Button>
            <Button onClick={handleAddMember} loading={saving} disabled={!memberForm.userId}>Add</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TeamsPage;
