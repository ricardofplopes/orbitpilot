import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Package } from 'lucide-react';
import { capacity, teams as teamsApi } from '@/api/services';
import client from '@/api/client';
import { useTeam } from '@/context/TeamContext';
import Modal from '@/components/common/Modal';
import Button from '@/components/common/Button';
import Spinner from '@/components/common/Spinner';
import EmptyState from '@/components/common/EmptyState';

interface PtoEntry {
  id: string;
  memberId: string;
  memberName: string;
  date: string;
  type: string;
  hours: number;
}

interface ReleaseData {
  id: string;
  version: string;
  status: string;
  releaseDate: string | null;
  startDate: string | null;
}

interface TeamMemberInfo {
  id: string;
  userId: string;
  user: { name: string };
  isActive: boolean;
}

const PTO_COLORS: Record<string, string> = {
  pto: '#3B82F6',
  sick: '#F59E0B',
  holiday: '#10B981',
  other: '#8B5CF6',
};

const PTO_LABELS: Record<string, string> = {
  pto: 'PTO',
  sick: 'Sick',
  holiday: 'Holiday',
  other: 'Other',
};

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  // Adjust to Monday start (0=Mon, 6=Sun)
  let startOffset = firstDay.getDay() - 1;
  if (startOffset < 0) startOffset = 6;

  const days: Array<{ date: string; day: number; isCurrentMonth: boolean }> = [];

  // Previous month padding
  for (let i = startOffset - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push({ date: fmt(d), day: d.getDate(), isCurrentMonth: false });
  }

  // Current month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dt = new Date(year, month, d);
    days.push({ date: fmt(dt), day: d, isCurrentMonth: true });
  }

  // Next month padding (fill to 42 cells = 6 rows)
  while (days.length < 42) {
    const d = new Date(year, month + 1, days.length - startOffset - lastDay.getDate() + 1);
    days.push({ date: fmt(d), day: d.getDate(), isCurrentMonth: false });
  }

  return days;
}

function fmt(d: Date): string {
  return d.toISOString().split('T')[0];
}

const CalendarPage: React.FC = () => {
  const { selectedTeamId, selectedTeam } = useTeam();
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [ptoEntries, setPtoEntries] = useState<PtoEntry[]>([]);
  const [releases, setReleases] = useState<ReleaseData[]>([]);
  const [members, setMembers] = useState<TeamMemberInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [ptoForm, setPtoForm] = useState({ teamMemberId: '', type: 'pto', hours: 8 });
  const [saving, setSaving] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const monthEnd = fmt(new Date(year, month + 1, 0));

  // Fetch PTO entries and releases for the month
  useEffect(() => {
    if (!selectedTeamId) return;
    setLoading(true);

    Promise.all([
      capacity.getTeamAvailability(selectedTeamId, monthStart, monthEnd),
      client.get(`/work/releases?status=unreleased`).then(r => r.data),
      teamsApi.getTeams(),
    ])
      .then(([pto, rels, teamsList]) => {
        setPtoEntries(pto as PtoEntry[]);
        setReleases(rels as ReleaseData[]);
        const team = teamsList.find((t: any) => t.id === selectedTeamId);
        if (team?.members) {
          setMembers((team.members as any[]).filter((m: any) => m.isActive));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedTeamId, monthStart, monthEnd]);

  const days = useMemo(() => getMonthDays(year, month), [year, month]);

  // Group PTO by date
  const ptoByDate = useMemo(() => {
    const map = new Map<string, PtoEntry[]>();
    for (const entry of ptoEntries) {
      if (!map.has(entry.date)) map.set(entry.date, []);
      map.get(entry.date)!.push(entry);
    }
    return map;
  }, [ptoEntries]);

  // Releases by date
  const releasesByDate = useMemo(() => {
    const map = new Map<string, ReleaseData[]>();
    for (const rel of releases) {
      if (rel.releaseDate) {
        const d = rel.releaseDate.split('T')[0];
        if (!map.has(d)) map.set(d, []);
        map.get(d)!.push(rel);
      }
    }
    return map;
  }, [releases]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  const handleDayClick = (date: string) => {
    setSelectedDate(date);
    setShowAddModal(true);
  };

  const handleAddPto = async () => {
    if (!ptoForm.teamMemberId || !selectedDate) return;
    setSaving(true);
    try {
      await capacity.setAvailability({
        teamMemberId: ptoForm.teamMemberId,
        date: selectedDate,
        type: ptoForm.type,
        hours: ptoForm.hours,
      } as any);
      // Refresh
      const pto = await capacity.getTeamAvailability(selectedTeamId!, monthStart, monthEnd);
      setPtoEntries(pto as PtoEntry[]);
      setShowAddModal(false);
      setPtoForm({ teamMemberId: '', type: 'pto', hours: 8 });
    } catch {
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePto = async (id: string) => {
    try {
      await capacity.deleteAvailability(id);
      setPtoEntries(prev => prev.filter(e => e.id !== id));
    } catch {}
  };

  if (!selectedTeamId) {
    return <EmptyState title="Select a team" description="Choose a team from the top selector to view the calendar." />;
  }

  const today = fmt(new Date());
  const monthLabel = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-orbit-light">Calendar</h2>
          <p className="text-sm text-orbit-slate mt-1">
            Team PTO and release schedule for {selectedTeam?.name || 'team'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={goToday}>Today</Button>
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-orbit-navy-light text-orbit-slate hover:text-orbit-light transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-lg font-semibold text-orbit-light min-w-[180px] text-center">{monthLabel}</span>
          <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-orbit-navy-light text-orbit-slate hover:text-orbit-light transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs">
        {Object.entries(PTO_LABELS).map(([key, label]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: PTO_COLORS[key] }} />
            <span className="text-orbit-slate">{label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <Package className="w-3 h-3 text-emerald-400" />
          <span className="text-orbit-slate">Release</span>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : (
        <div className="card p-2">
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs font-medium text-orbit-slate py-2">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-px bg-orbit-navy-lighter/30 rounded-lg overflow-hidden">
            {days.map((day, i) => {
              const dayPto = ptoByDate.get(day.date) || [];
              const dayReleases = releasesByDate.get(day.date) || [];
              const isToday = day.date === today;
              const isWeekend = i % 7 >= 5;

              return (
                <div
                  key={day.date}
                  className={`min-h-[90px] p-1 cursor-pointer transition-colors ${
                    day.isCurrentMonth ? 'bg-orbit-card' : 'bg-orbit-navy/50'
                  } ${isToday ? 'ring-1 ring-orbit-blue' : ''} ${
                    isWeekend && day.isCurrentMonth ? 'bg-orbit-navy-light/50' : ''
                  } hover:bg-orbit-navy-light/80`}
                  onClick={() => day.isCurrentMonth && handleDayClick(day.date)}
                >
                  <div className={`text-xs font-medium mb-0.5 ${
                    isToday ? 'text-orbit-blue' : day.isCurrentMonth ? 'text-orbit-light' : 'text-orbit-slate/50'
                  }`}>
                    {day.day}
                  </div>

                  {/* PTO entries */}
                  {dayPto.slice(0, 3).map(entry => (
                    <div
                      key={entry.id}
                      className="text-[10px] px-1 py-0.5 rounded mb-0.5 truncate flex items-center gap-0.5 group"
                      style={{ backgroundColor: `${PTO_COLORS[entry.type] || PTO_COLORS.other}20`, color: PTO_COLORS[entry.type] || PTO_COLORS.other }}
                      title={`${entry.memberName} - ${PTO_LABELS[entry.type] || entry.type} (${entry.hours}h)`}
                    >
                      <span className="truncate flex-1">{entry.memberName.split(' ')[0]}</span>
                      <button
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => { e.stopPropagation(); handleDeletePto(entry.id); }}
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                  {dayPto.length > 3 && (
                    <div className="text-[9px] text-orbit-slate">+{dayPto.length - 3} more</div>
                  )}

                  {/* Release markers */}
                  {dayReleases.map(rel => (
                    <div
                      key={rel.id}
                      className="text-[10px] px-1 py-0.5 rounded mb-0.5 truncate bg-emerald-500/20 text-emerald-400 flex items-center gap-0.5"
                      title={`Release: ${rel.version}`}
                    >
                      <Package className="w-2.5 h-2.5 flex-shrink-0" />
                      <span className="truncate">{rel.version}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PTO Summary for month */}
      {ptoEntries.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-orbit-light mb-3">PTO Summary — {monthLabel}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(() => {
              const byMember = new Map<string, { name: string; days: number }>();
              for (const e of ptoEntries) {
                if (!byMember.has(e.memberId)) byMember.set(e.memberId, { name: e.memberName, days: 0 });
                byMember.get(e.memberId)!.days += e.hours / 8;
              }
              return Array.from(byMember.values())
                .sort((a, b) => b.days - a.days)
                .map(m => (
                  <div key={m.name} className="flex items-center justify-between bg-orbit-navy-light/50 rounded-lg px-3 py-2">
                    <span className="text-xs text-orbit-light truncate">{m.name.split(' ')[0]}</span>
                    <span className="text-xs font-medium text-orbit-blue">{m.days}d</span>
                  </div>
                ));
            })()}
          </div>
        </div>
      )}

      {/* Add PTO Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title={`Add Time Off — ${selectedDate}`}>
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-orbit-slate">Team Member</label>
            <select
              className="input"
              value={ptoForm.teamMemberId}
              onChange={(e) => setPtoForm({ ...ptoForm, teamMemberId: e.target.value })}
            >
              <option value="">Select person...</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.user.name}</option>
              ))}
            </select>
          </div>
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
          <div className="space-y-1">
            <label className="block text-sm font-medium text-orbit-slate">Hours</label>
            <select
              className="input"
              value={ptoForm.hours}
              onChange={(e) => setPtoForm({ ...ptoForm, hours: Number(e.target.value) })}
            >
              <option value={4}>Half day (4h)</option>
              <option value={8}>Full day (8h)</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleAddPto} loading={saving} disabled={!ptoForm.teamMemberId}>
              <Plus className="w-4 h-4" /> Add
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CalendarPage;
