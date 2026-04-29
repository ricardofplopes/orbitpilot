import React from 'react';

type BadgeVariant = 'blue' | 'purple' | 'green' | 'amber' | 'red' | 'slate';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  blue: 'bg-orbit-blue/20 text-blue-400 border-orbit-blue/30',
  purple: 'bg-orbit-purple/20 text-purple-400 border-orbit-purple/30',
  green: 'bg-orbit-green/20 text-emerald-400 border-orbit-green/30',
  amber: 'bg-orbit-amber/20 text-amber-400 border-orbit-amber/30',
  red: 'bg-red-500/20 text-red-400 border-red-500/30',
  slate: 'bg-orbit-slate/20 text-orbit-slate border-orbit-slate/30',
};

const Badge: React.FC<BadgeProps> = ({ variant = 'blue', children, className = '' }) => {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

export default Badge;
