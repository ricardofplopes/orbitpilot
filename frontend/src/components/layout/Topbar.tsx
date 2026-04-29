import React from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, ChevronDown, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const pageTitles: Record<string, string> = {
  '/': 'Overview',
  '/capacity': 'Capacity',
  '/planning': 'Planning',
  '/teams': 'Teams',
  '/people': 'People',
  '/work': 'Work',
  '/reports': 'Reports',
  '/integrations': 'Integrations',
  '/settings': 'Settings',
};

const Topbar: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const title = pageTitles[location.pathname] || 'OrbitPilot';

  return (
    <header className="h-16 border-b border-orbit-navy-lighter/50 bg-orbit-navy/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-20">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-semibold text-orbit-light">{title}</h1>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orbit-navy-lighter/50 text-sm text-orbit-slate hover:text-orbit-light transition-colors">
          Q3 2026 Plan
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-4">
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orbit-navy-lighter/50 text-sm text-orbit-slate hover:text-orbit-light transition-colors">
          All Teams
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
        <button className="relative p-2 rounded-lg hover:bg-orbit-navy-lighter transition-colors">
          <Bell className="w-5 h-5 text-orbit-slate" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-orbit-blue" />
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
