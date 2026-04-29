import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => {
  return (
    <div className="space-y-1">
      {label && <label className="block text-sm font-medium text-orbit-slate">{label}</label>}
      <input
        className={`w-full px-3 py-2 rounded-lg bg-orbit-navy border border-orbit-navy-lighter text-orbit-light placeholder-orbit-slate focus:outline-none focus:border-orbit-blue focus:ring-1 focus:ring-orbit-blue transition-all duration-200 ${
          error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
        } ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
};

export default Input;
