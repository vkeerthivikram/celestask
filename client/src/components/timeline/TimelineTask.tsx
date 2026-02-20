'use client';

import React, { useState } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Task, TaskStatus, TaskPriority } from '../../types';
import { STATUS_CONFIG, PRIORITY_CONFIG } from '../../types';

interface TimelineTaskProps {
  task: Task;
  left: number;
  width: number;
  onClick?: (task: Task) => void;
}

// Get status color for task bar
const getStatusColorClass = (status: TaskStatus): string => {
  const colorMap: Record<TaskStatus, string> = {
    backlog: 'bg-gray-400',
    todo: 'bg-blue-500',
    in_progress: 'bg-amber-500',
    review: 'bg-purple-500',
    done: 'bg-green-500',
  };
  return colorMap[status];
};

// Get status border color
const getStatusBorderClass = (status: TaskStatus): string => {
  const colorMap: Record<TaskStatus, string> = {
    backlog: 'border-gray-500',
    todo: 'border-blue-600',
    in_progress: 'border-amber-600',
    review: 'border-purple-600',
    done: 'border-green-600',
  };
  return colorMap[status];
};

export function TimelineTask({ task, left, width, onClick }: TimelineTaskProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.(task);
  };

  // Calculate progress if task is in progress
  const getProgress = (): number | null => {
    if (task.status !== 'in_progress' || !task.start_date || !task.due_date) {
      return null;
    }

    const startDate = new Date(task.start_date);
    const dueDate = new Date(task.due_date);
    const today = new Date();

    if (today <= startDate) return 0;
    if (today >= dueDate) return 100;

    const totalDuration = dueDate.getTime() - startDate.getTime();
    const elapsed = today.getTime() - startDate.getTime();
    return Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
  };

  const progress = getProgress();

  return (
    <div
      className="relative my-1"
      style={{
        position: 'absolute',
        left: `${left}%`,
        width: `${Math.max(width, 2)}%`,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Task Bar */}
      <button
        onClick={handleClick}
        className={twMerge(
          clsx(
            'w-full h-8 rounded-md border-l-2 transition-all duration-150',
            'cursor-pointer',
            getStatusColorClass(task.status),
            getStatusBorderClass(task.status),
            isHovered && 'ring-2 ring-offset-1 ring-gray-400 scale-y-110'
          )
        )}
        aria-label={`Task: ${task.title}`}
      >
        {/* Progress indicator */}
        {progress !== null && (
          <div
            className="h-full bg-white/30 rounded-r-md"
            style={{ width: `${100 - progress}%`, marginLeft: 'auto' }}
          />
        )}
      </button>

      {/* Hover tooltip */}
      {isHovered && (
        <div
          className={twMerge(
            clsx(
              'absolute z-50 bottom-full mb-2 left-0',
              'bg-white dark:bg-gray-900 rounded-lg shadow-lg',
              'border border-gray-200 dark:border-gray-700',
              'p-3 min-w-[200px] max-w-[300px]',
              'text-sm'
            )
          )}
        >
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
            {task.title}
          </h4>
          <div className="mt-2 space-y-1">
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: STATUS_CONFIG[task.status].color }}
              />
              <span className="text-gray-600 dark:text-gray-400">
                {STATUS_CONFIG[task.status].label}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: PRIORITY_CONFIG[task.priority].color }}
              />
              <span className="text-gray-600 dark:text-gray-400">
                {PRIORITY_CONFIG[task.priority].label} priority
              </span>
            </div>
            {task.start_date && task.due_date && (
              <div className="text-gray-500 dark:text-gray-500 text-xs mt-2">
                {new Date(task.start_date).toLocaleDateString()} -{' '}
                {new Date(task.due_date).toLocaleDateString()}
              </div>
            )}
          </div>
          {/* Arrow */}
          <div
            className={twMerge(
              clsx(
                'absolute top-full left-4',
                'border-8 border-transparent',
                'border-t-white dark:border-t-gray-900'
              )
            )}
          />
        </div>
      )}
    </div>
  );
}

export default TimelineTask;
