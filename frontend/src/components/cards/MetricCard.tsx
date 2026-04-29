import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
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

const MetricCard: React.FC<MetricCardProps> = ({ title, value, subtitle, trend, trendValue, accentColor = 'blue' }) => {
  return (
    <div className="card group">
      <p className="text-sm text-orbit-slate font-medium mb-1">{title}</p>
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
