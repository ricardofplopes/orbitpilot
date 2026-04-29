import React from 'react';
import { Info, AlertTriangle, AlertCircle } from 'lucide-react';
import type { Insight } from '@/types';

interface InsightCardProps {
  insight: Insight;
}

const severityConfig: Record<string, { icon: React.ReactNode; border: string; bg: string }> = {
  info: {
    icon: <Info className="w-5 h-5 text-blue-400" />,
    border: 'border-orbit-blue/30',
    bg: 'bg-orbit-blue/5',
  },
  warning: {
    icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
    border: 'border-orbit-amber/30',
    bg: 'bg-orbit-amber/5',
  },
  critical: {
    icon: <AlertCircle className="w-5 h-5 text-red-400" />,
    border: 'border-red-500/30',
    bg: 'bg-red-500/5',
  },
};

const InsightCard: React.FC<InsightCardProps> = ({ insight }) => {
  const config = severityConfig[insight.severity] || severityConfig.info;

  return (
    <div className={`rounded-xl border ${config.border} ${config.bg} p-4 transition-all duration-200 hover:shadow-glow-blue`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{config.icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-orbit-light">{insight.message}</p>
          <p className="text-xs text-orbit-slate mt-1">
            {new Date(insight.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default InsightCard;
