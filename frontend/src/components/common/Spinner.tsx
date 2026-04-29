import React from 'react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className = '' }) => {
  const sizes = { sm: 'w-5 h-5', md: 'w-8 h-8', lg: 'w-12 h-12' };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className={`${sizes[size]} relative`}>
        <div className={`${sizes[size]} rounded-full border-2 border-orbit-navy-lighter border-t-orbit-blue animate-spin`} />
        <div
          className={`absolute inset-0 ${sizes[size]} rounded-full border-2 border-transparent border-b-orbit-purple animate-spin`}
          style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}
        />
      </div>
    </div>
  );
};

export default Spinner;
