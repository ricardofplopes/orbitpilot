import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  BarChart3,
  Calendar,
  Users,
  ListChecks,
  LineChart,
  Plug,
  Settings,
} from 'lucide-react';

const navItems = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/capacity', label: 'Capacity', icon: BarChart3 },
  { to: '/planning', label: 'Plan', icon: Calendar },
  { to: '/teams', label: 'Teams', icon: Users },
  { to: '/work', label: 'Work', icon: ListChecks },
  { to: '/reports', label: 'Reports', icon: LineChart },
  { to: '/integrations', label: 'Integrations', icon: Plug },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const Sidebar: React.FC = () => {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-orbit-navy border-r border-orbit-navy-lighter/50 flex flex-col z-30">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-orbit-navy-lighter/50">
        <div className="w-8 h-8 rounded-lg bg-gradient-brand flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="4" />
            <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-25 12 12)" />
          </svg>
        </div>
        <span className="text-lg font-bold gradient-text">OrbitPilot</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon }) => {
          const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);
          return (
            <NavLink
              key={to}
              to={to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-brand text-white shadow-glow-blue'
                  : 'text-orbit-slate hover:text-orbit-light hover:bg-orbit-navy-light'
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {label}
            </NavLink>
          );
        })}
      </nav>

      {/* Tagline */}
      <div className="px-5 py-4 border-t border-orbit-navy-lighter/50">
        <p className="text-xs text-orbit-slate text-center">Plan better. Deliver together.</p>
      </div>
    </aside>
  );
};

export default Sidebar;
