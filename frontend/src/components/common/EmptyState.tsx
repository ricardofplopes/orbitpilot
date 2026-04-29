import React from 'react';
import { Inbox } from 'lucide-react';
import Button from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, actionLabel, onAction }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 text-orbit-slate">
        {icon || <Inbox className="w-12 h-12" />}
      </div>
      <h3 className="text-lg font-semibold text-orbit-light mb-1">{title}</h3>
      {description && <p className="text-sm text-orbit-slate max-w-md mb-4">{description}</p>}
      {actionLabel && onAction && (
        <Button onClick={onAction}>{actionLabel}</Button>
      )}
    </div>
  );
};

export default EmptyState;
