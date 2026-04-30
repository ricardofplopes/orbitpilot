import React, { useState } from 'react';
import { Calendar, Plus, Users } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { capacity, teams as teamsApi } from '@/api/services';
import { useTeam } from '@/context/TeamContext';
import CapacityChart from '@/components/charts/CapacityChart';
import Modal from '@/components/common/Modal';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Spinner from '@/components/common/Spinner';
import ErrorState from '@/components/common/ErrorState';
import EmptyState from '@/components/common/EmptyState';
import type { Team, TeamMember } from '@/types';

const CapacityPage: React.FC = () => {
  const { selectedTeamId, selectedTeam } = useTeam();
  const { data: capData, loading, error, refetch } = useApi(
    () => selectedTeamId ? capacity.getTeamCapacity(selectedTeamId) : capacity.getSummary(),
    [selectedTeamId]
  );
  const { data: teamsList } = useApi<Team[]>(() => teamsApi.getTeams());
  const [showPtoModal, setShowPtoModal] = useState(false);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [ptoForm, setPtoForm] = useState({ teamMemberId: '', date: '', type: 'pto', hours: 8 });
  const [periodForm, setPeriodForm] = useState({ name: '', startDate: '', endDate: '' });
  const [saving, setSaving] = useState(false);
  const [selectedTeamFilter, setSelectedTeamFilter] = useState('');

  // Flatten all members from teams for the PTO dropdown
  const allMembers: (TeamMember & { teamName: string })[] = [];
  teamsList?.forEach((team) => {
    team.members?.forEach((m) => {
      allMembers.push({ ...m, teamName: team.name });
    });
  });

  const handleAddPto = async () => {
    setSaving(true);
    try {
      await capacity.setAvailability(ptoForm);
      setShowPtoModal(false);
      setPtoForm({ teamMemberId: '', date: '', type: 'pto', hours: 8 });
      refetch();
    } catch {
      // Error handled by API client
    } finally {
      setSaving(false);
    }
  };

  const handleCreatePeriod = async () => {
    setSaving(true);
    try {
      await capacity.createPeriod(periodForm);
      setShowPeriodModal(false);
      setPeriodForm({ name: '', startDate: '', endDate: '' });
      refetch();
    } catch {
      // Error handled by API client
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const capacityByTeam = Array.isArray(capData)
    ? capData.map((t: any) => ({
        team: t.teamName || t.team || 'Unknown',
        available: t.availableHours || t.available || 0,
        committed: t.committedHours || t.committed || 0,
        atRisk: t.atRisk || 0,
        unavailable: t.ptoHours || t.unavailable || 0,
        utilizationPercent: t.utilizationPercent || 0,
        memberCount: t.memberCount || 0,
        color: t.color,
      }))
    : [];

  const filteredCapacity = selectedTeamFilter
    ? capacityByTeam.filter((t) => t.team === selectedTeamFilter)
    : capacityByTeam;

  const totalAvailable = capacityByTeam.reduce((s, t) => s + t.available, 0);
  const totalCommitted = capacityByTeam.reduce((s, t) => s + t.committed, 0);
  const totalPto = capacityByTeam.reduce((s, t) => s + t.unavailable, 0);
  const avgUtilization = capacityByTeam.length > 0
    ? Math.round(capacityByTeam.reduce((s, t) => s + t.utilizationPercent, 0) / capacityByTeam.length)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-orbit-light">Capacity Planning</h2>
          <p className="text-sm text-orbit-slate mt-1">Monitor team capacity and availability</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => setShowPeriodModal(true)}>
            <Calendar className="w-4 h-4" /> New Period
          </Button>
          <Button onClick={() => setShowPtoModal(true)}>
            <Plus className="w-4 h-4" /> Add Unavailability
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-sm text-orbit-slate">Total Available</p>
          <p className="text-2xl font-bold text-orbit-blue">{totalAvailable}h</p>
        </div>
        <div className="card">
          <p className="text-sm text-orbit-slate">Total Committed</p>
          <p className="text-2xl font-bold text-orbit-purple">{totalCommitted}h</p>
        </div>
        <div className="card">
          <p className="text-sm text-orbit-slate">PTO / Unavailable</p>
          <p className="text-2xl font-bold text-orbit-amber">{totalPto}h</p>
        </div>
        <div className="card">
          <p className="text-sm text-orbit-slate">Avg Utilization</p>
          <p className={`text-2xl font-bold ${avgUtilization > 90 ? 'text-red-400' : avgUtilization > 75 ? 'text-orbit-amber' : 'text-orbit-green'}`}>
            {avgUtilization}%
          </p>
        </div>
      </div>

      {/* Team Filter */}
      <div className="flex items-center gap-4">
        <select className="input max-w-xs" value={selectedTeamFilter} onChange={(e) => setSelectedTeamFilter(e.target.value)}>
          <option value="">All Teams</option>
          {capacityByTeam.map((t) => <option key={t.team} value={t.team}>{t.team}</option>)}
        </select>
      </div>

      {/* Capacity Chart */}
      <div className="card">
        <h3 className="text-lg font-semibold text-orbit-light mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-orbit-blue" />
          Capacity by Team
        </h3>
        {filteredCapacity.length > 0 ? (
          <CapacityChart data={filteredCapacity} />
        ) : (
          <p className="text-sm text-orbit-slate py-8 text-center">No capacity data available. Set up teams and periods first.</p>
        )}
      </div>

      {/* Team Breakdown Table */}
      {capacityByTeam.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-orbit-light mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-orbit-purple" />
            Team Breakdown
          </h3>
          <div className="overflow-x-auto rounded-xl border border-orbit-navy-lighter/50">
            <table className="w-full">
              <thead className="bg-orbit-navy-light">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-orbit-slate uppercase">Team</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-orbit-slate uppercase">Members</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-orbit-slate uppercase">Available</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-orbit-slate uppercase">Committed</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-orbit-slate uppercase">PTO</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-orbit-slate uppercase">Utilization</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-orbit-navy-lighter/30">
                {capacityByTeam.map((t) => (
                  <tr key={t.team} className="hover:bg-orbit-navy-light/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color || '#2563EB' }} />
                        <span className="text-sm font-medium text-orbit-light">{t.team}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-orbit-slate">{t.memberCount}</td>
                    <td className="px-4 py-3 text-sm text-orbit-slate">{t.available}h</td>
                    <td className="px-4 py-3 text-sm text-orbit-slate">{t.committed}h</td>
                    <td className="px-4 py-3 text-sm text-orbit-slate">{t.unavailable}h</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-orbit-navy rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(t.utilizationPercent, 100)}%`,
                              background: t.utilizationPercent > 90 ? '#EF4444' : t.utilizationPercent > 75 ? '#F59E0B' : '#10B981',
                            }}
                          />
                        </div>
                        <span className={`text-xs font-medium ${
                          t.utilizationPercent > 90 ? 'text-red-400' : t.utilizationPercent > 75 ? 'text-amber-400' : 'text-emerald-400'
                        }`}>{t.utilizationPercent}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PTO Modal */}
      <Modal isOpen={showPtoModal} onClose={() => setShowPtoModal(false)} title="Add Unavailability">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-orbit-slate">Team Member</label>
            <select className="input" value={ptoForm.teamMemberId} onChange={(e) => setPtoForm({ ...ptoForm, teamMemberId: e.target.value })}>
              <option value="">Select a person...</option>
              {allMembers.map((m) => (
                <option key={m.id} value={m.id}>{m.user?.name || m.userId} ({m.teamName})</option>
              ))}
            </select>
          </div>
          <Input
            label="Date"
            type="date"
            value={ptoForm.date}
            onChange={(e) => setPtoForm({ ...ptoForm, date: e.target.value })}
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-orbit-slate">Type</label>
            <select
              className="input"
              value={ptoForm.type}
              onChange={(e) => setPtoForm({ ...ptoForm, type: e.target.value })}
            >
              <option value="pto">PTO</option>
              <option value="sick">Sick Leave</option>
              <option value="holiday">Holiday</option>
              <option value="other">Other</option>
            </select>
          </div>
          <Input
            label="Hours"
            type="number"
            value={String(ptoForm.hours)}
            onChange={(e) => setPtoForm({ ...ptoForm, hours: Number(e.target.value) })}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowPtoModal(false)}>Cancel</Button>
            <Button onClick={handleAddPto} loading={saving} disabled={!ptoForm.teamMemberId}>Save</Button>
          </div>
        </div>
      </Modal>

      {/* Create Period Modal */}
      <Modal isOpen={showPeriodModal} onClose={() => setShowPeriodModal(false)} title="Create Capacity Period">
        <div className="space-y-4">
          <Input label="Period Name" placeholder="Q3 2026" value={periodForm.name} onChange={(e) => setPeriodForm({ ...periodForm, name: e.target.value })} />
          <Input label="Start Date" type="date" value={periodForm.startDate} onChange={(e) => setPeriodForm({ ...periodForm, startDate: e.target.value })} />
          <Input label="End Date" type="date" value={periodForm.endDate} onChange={(e) => setPeriodForm({ ...periodForm, endDate: e.target.value })} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowPeriodModal(false)}>Cancel</Button>
            <Button onClick={handleCreatePeriod} loading={saving}>Create</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CapacityPage;
