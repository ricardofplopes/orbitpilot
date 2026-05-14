import React from 'react';
import { TrendingUp, TrendingDown, Info } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  helpText?: string;
  trend?: 'up' | 'down';
  trendValue?: string;
  accentColor?: 'green' | 'amber' | 'red' | 'blue' | 'purple';
}

const accentColors: Record<string, string> = {
  green: 'text-emerald-400',
  amber: 'text-amber-400',
  red: 'text-red-400',
  blue: 'text-blue-400',
  purple: 'text-purple-400',
};

const MetricCard: React.FC<MetricCardProps> = ({ title, value, subtitle, helpText, trend, trendValue, accentColor = 'blue' }) => {
  return (
    <div className="card group">
      <div className="flex items-center gap-1.5 mb-1">
        <p className="text-sm text-orbit-slate font-medium">{title}</p>
        {helpText && (
          <span className="relative inline-flex items-center group/info">
            <Info className="w-3.5 h-3.5 text-orbit-slate hover:text-orbit-light cursor-help" />
            <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-64 -translate-x-1/2 rounded-lg border border-orbit-navy-lighter/60 bg-orbit-navy px-2.5 py-2 text-[11px] leading-relaxed text-orbit-slate opacity-0 shadow-xl transition-opacity group-hover/info:opacity-100">
              {helpText}
            </span>
          </span>
        )}
      </div>
      <div className="flex items-end gap-3">
        <p className={`text-3xl font-bold ${accentColors[accentColor]}`}>{value}</p>
        {trend && (
          <div className={`flex items-center gap-1 mb-1 text-xs font-medium ${trend === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
            {trend === 'up' ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {trendValue}
          </div>
        )}
      </div>
      {subtitle && <p className="text-xs text-orbit-slate mt-1">{subtitle}</p>}
    </div>
  );
};

export default MetricCard;
