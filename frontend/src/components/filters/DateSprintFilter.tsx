import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, X } from 'lucide-react';

export type FilterMode = 'date' | 'sprint';

export interface DateFilter {
  mode: 'date';
  startDate: string;
  endDate: string;
  label: string;
}

export interface SprintFilter {
  mode: 'sprint';
  sprints: string[];
  label: string;
}

export type FilterState = DateFilter | SprintFilter | null;

interface DatePreset {
  label: string;
  getRange: () => { start: string; end: string };
}

const formatDate = (d: Date) => d.toISOString().split('T')[0];

const DATE_PRESETS: DatePreset[] = [
  {
    label: 'This week',
    getRange: () => {
      const now = new Date();
      const day = now.getDay();
      const start = new Date(now);
      start.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { start: formatDate(start), end: formatDate(end) };
    },
  },
  {
    label: 'This month',
    getRange: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { start: formatDate(start), end: formatDate(end) };
    },
  },
  {
    label: 'This quarter',
    getRange: () => {
      const now = new Date();
      const q = Math.floor(now.getMonth() / 3);
      const start = new Date(now.getFullYear(), q * 3, 1);
      const end = new Date(now.getFullYear(), q * 3 + 3, 0);
      return { start: formatDate(start), end: formatDate(end) };
    },
  },
  {
    label: 'This year',
    getRange: () => {
      const now = new Date();
      return { start: formatDate(new Date(now.getFullYear(), 0, 1)), end: formatDate(new Date(now.getFullYear(), 11, 31)) };
    },
  },
  {
    label: 'Last week',
    getRange: () => {
      const now = new Date();
      const day = now.getDay();
      const end = new Date(now);
      end.setDate(now.getDate() - (day === 0 ? 7 : day));
      const start = new Date(end);
      start.setDate(end.getDate() - 6);
      return { start: formatDate(start), end: formatDate(end) };
    },
  },
  {
    label: 'Last 2 weeks',
    getRange: () => {
      const now = new Date();
      const start = new Date(now);
      start.setDate(now.getDate() - 14);
      return { start: formatDate(start), end: formatDate(now) };
    },
  },
  {
    label: 'Last 4 weeks',
    getRange: () => {
      const now = new Date();
      const start = new Date(now);
      start.setDate(now.getDate() - 28);
      return { start: formatDate(start), end: formatDate(now) };
    },
  },
  {
    label: 'Last month',
    getRange: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start: formatDate(start), end: formatDate(end) };
    },
  },
  {
    label: 'Last 3 months',
    getRange: () => {
      const now = new Date();
      const start = new Date(now);
      start.setMonth(now.getMonth() - 3);
      return { start: formatDate(start), end: formatDate(now) };
    },
  },
  {
    label: 'Last quarter',
    getRange: () => {
      const now = new Date();
      const q = Math.floor(now.getMonth() / 3) - 1;
      const year = q < 0 ? now.getFullYear() - 1 : now.getFullYear();
      const adjQ = q < 0 ? 3 : q;
      const start = new Date(year, adjQ * 3, 1);
      const end = new Date(year, adjQ * 3 + 3, 0);
      return { start: formatDate(start), end: formatDate(end) };
    },
  },
  {
    label: 'Last 12 months',
    getRange: () => {
      const now = new Date();
      const start = new Date(now);
      start.setFullYear(now.getFullYear() - 1);
      return { start: formatDate(start), end: formatDate(now) };
    },
  },
  {
    label: 'Last year',
    getRange: () => {
      const now = new Date();
      return {
        start: formatDate(new Date(now.getFullYear() - 1, 0, 1)),
        end: formatDate(new Date(now.getFullYear() - 1, 11, 31)),
      };
    },
  },
];

interface Props {
  value: FilterState;
  onChange: (filter: FilterState) => void;
  availableSprints?: { name: string; itemCount: number }[];
}

const DateSprintFilter: React.FC<Props> = ({ value, onChange, availableSprints = [] }) => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<FilterMode>(value?.mode || 'date');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [selectedSprints, setSelectedSprints] = useState<string[]>(
    value?.mode === 'sprint' ? value.sprints : []
  );
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePreset = (preset: DatePreset) => {
    const { start, end } = preset.getRange();
    onChange({ mode: 'date', startDate: start, endDate: end, label: preset.label });
    setOpen(false);
  };

  const handleCustomApply = () => {
    if (customStart && customEnd) {
      onChange({ mode: 'date', startDate: customStart, endDate: customEnd, label: `${customStart} – ${customEnd}` });
      setOpen(false);
    }
  };

  const handleSprintToggle = (sprintName: string) => {
    const newSprints = selectedSprints.includes(sprintName)
      ? selectedSprints.filter(s => s !== sprintName)
      : [...selectedSprints, sprintName];
    setSelectedSprints(newSprints);
  };

  const handleSprintApply = () => {
    if (selectedSprints.length > 0) {
      onChange({
        mode: 'sprint',
        sprints: selectedSprints,
        label: selectedSprints.length === 1 ? selectedSprints[0] : `${selectedSprints.length} sprints`,
      });
    } else {
      onChange(null);
    }
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setSelectedSprints([]);
    setCustomStart('');
    setCustomEnd('');
  };

  const displayLabel = value ? value.label : 'All time';

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orbit-card border border-orbit-navy-lighter/50 text-sm text-orbit-light hover:border-orbit-blue/50 transition-colors"
      >
        <Calendar className="w-4 h-4 text-orbit-slate" />
        <span>{displayLabel}</span>
        {value && (
          <X className="w-3.5 h-3.5 text-orbit-slate hover:text-red-400" onClick={handleClear} />
        )}
        <ChevronDown className={`w-4 h-4 text-orbit-slate transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 z-50 bg-orbit-card border border-orbit-navy-lighter/50 rounded-xl shadow-2xl w-[460px]">
          {/* Mode tabs */}
          <div className="flex border-b border-orbit-navy-lighter/50">
            <button
              onClick={() => setMode('date')}
              className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                mode === 'date' ? 'text-orbit-blue border-b-2 border-orbit-blue' : 'text-orbit-slate hover:text-orbit-light'
              }`}
            >
              Date Range
            </button>
            <button
              onClick={() => setMode('sprint')}
              className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                mode === 'sprint' ? 'text-orbit-blue border-b-2 border-orbit-blue' : 'text-orbit-slate hover:text-orbit-light'
              }`}
            >
              Sprints
            </button>
          </div>

          {mode === 'date' ? (
            <div className="p-4">
              {/* Presets grid */}
              <div className="grid grid-cols-3 gap-1.5 mb-4">
                {DATE_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => handlePreset(preset)}
                    className={`px-2.5 py-2 text-xs rounded-md transition-colors text-center ${
                      value?.mode === 'date' && value.label === preset.label
                        ? 'bg-orbit-blue/20 text-orbit-blue border border-orbit-blue/30'
                        : 'text-orbit-slate hover:bg-orbit-navy-light hover:text-orbit-light'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Custom range */}
              <div className="border-t border-orbit-navy-lighter/50 pt-3">
                <p className="text-xs text-orbit-slate mb-2">Custom range</p>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="flex-1 input text-xs py-1.5"
                  />
                  <span className="text-orbit-slate text-xs">to</span>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="flex-1 input text-xs py-1.5"
                  />
                  <button
                    onClick={handleCustomApply}
                    disabled={!customStart || !customEnd}
                    className="btn-primary text-xs py-1.5 px-3 disabled:opacity-50"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4">
              {availableSprints.length === 0 ? (
                <p className="text-sm text-orbit-slate text-center py-4">No sprints available. Sync from Jira first.</p>
              ) : (
                <>
                  <div className="max-h-60 overflow-y-auto space-y-1 mb-3">
                    {availableSprints.map((sprint) => (
                      <label
                        key={sprint.name}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-orbit-navy-light cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedSprints.includes(sprint.name)}
                          onChange={() => handleSprintToggle(sprint.name)}
                          className="w-4 h-4 rounded border-orbit-navy-lighter text-orbit-blue focus:ring-orbit-blue/50"
                        />
                        <span className="text-sm text-orbit-light flex-1">{sprint.name}</span>
                        <span className="text-xs text-orbit-slate">{sprint.itemCount} items</span>
                      </label>
                    ))}
                  </div>
                  <div className="border-t border-orbit-navy-lighter/50 pt-3 flex justify-between">
                    <button
                      onClick={() => setSelectedSprints([])}
                      className="text-xs text-orbit-slate hover:text-orbit-light"
                    >
                      Clear all
                    </button>
                    <button onClick={handleSprintApply} className="btn-primary text-xs py-1.5 px-4">
                      Apply ({selectedSprints.length})
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DateSprintFilter;
