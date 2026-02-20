'use client';

import React from 'react';

interface ProgressBarProps {
  percent: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}

const sizeClasses = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
};

export function ProgressBar({
  percent,
  showLabel = false,
  size = 'md',
  color,
  className = '',
}: ProgressBarProps) {
  // Clamp percent between 0 and 100
  const clampedPercent = Math.min(100, Math.max(0, percent));

  // Determine color based on progress if not specified
  const getProgressColor = () => {
    if (color) return color;
    if (clampedPercent >= 100) return 'bg-green-500';
    if (clampedPercent >= 75) return 'bg-emerald-500';
    if (clampedPercent >= 50) return 'bg-yellow-500';
    if (clampedPercent >= 25) return 'bg-orange-500';
    return 'bg-blue-500';
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className={`flex-1 bg-gray-200 rounded-full overflow-hidden ${sizeClasses[size]}`}
        role="progressbar"
        aria-valuenow={clampedPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${clampedPercent}% complete`}
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ease-in-out ${getProgressColor()}`}
          style={{ width: `${clampedPercent}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-medium text-gray-600 min-w-[2.5rem] text-right">
          {clampedPercent}%
        </span>
      )}
    </div>
  );
}

// Mini progress bar for use in cards and compact views
export function MiniProgressBar({
  percent,
  color,
  className = '',
}: {
  percent: number;
  color?: string;
  className?: string;
}) {
  const clampedPercent = Math.min(100, Math.max(0, percent));

  const getProgressColor = () => {
    if (color) return color;
    if (clampedPercent >= 100) return 'bg-green-500';
    if (clampedPercent >= 50) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  return (
    <div
      className={`h-1 w-full bg-gray-200 rounded-full overflow-hidden ${className}`}
      role="progressbar"
      aria-valuenow={clampedPercent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full rounded-full transition-all duration-300 ${getProgressColor()}`}
        style={{ width: `${clampedPercent}%` }}
      />
    </div>
  );
}

export default ProgressBar;
