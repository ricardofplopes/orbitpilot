import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, ChevronDown, User, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTeam } from '@/context/TeamContext';

const pageTitles: Record<string, string> = {
  '/': 'Overview',
  '/capacity': 'Capacity',
  '/planning': 'Planning',
  '/teams': 'Team Members',
  '/people': 'People',
  '/work': 'Work',
  '/reports': 'Reports',
  '/integrations': 'Integrations',
  '/settings': 'Settings',
};

const Topbar: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { teams, selectedTeam, setSelectedTeamId } = useTeam();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const title = pageTitles[location.pathname] || 'OrbitPilot';

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <header className="h-16 border-b border-orbit-navy-lighter/50 bg-orbit-navy/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-20">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-semibold text-orbit-light">{title}</h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Team Selector */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orbit-navy-lighter/50 text-sm text-orbit-slate hover:text-orbit-light transition-colors"
          >
            <Users className="w-4 h-4" />
            {selectedTeam?.name || 'Select Team'}
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          {showDropdown && teams.length > 0 && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-orbit-card border border-orbit-navy-lighter/50 rounded-xl shadow-xl z-50 overflow-hidden">
              {teams.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setSelectedTeamId(t.id); setShowDropdown(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    t.id === selectedTeam?.id
                      ? 'bg-orbit-blue/20 text-orbit-blue'
                      : 'text-orbit-slate hover:bg-orbit-navy-lighter/50 hover:text-orbit-light'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color || '#6366f1' }} />
                    {t.name}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <button className="relative p-2 rounded-lg hover:bg-orbit-navy-lighter transition-colors">
          <Bell className="w-5 h-5 text-orbit-slate" />
        </button>
        <div className="flex items-center gap-2 pl-4 border-l border-orbit-navy-lighter/50">
          <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-medium text-orbit-light">{user?.name || 'User'}</span>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
