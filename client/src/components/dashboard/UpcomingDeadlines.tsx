'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, differenceInDays, isPast, isToday, isTomorrow } from 'date-fns';
import { Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import type { Task } from '../../types';
import { PRIORITY_CONFIG, STATUS_CONFIG } from '../../types';
import { AppContextMenu } from '../common/AppContextMenu';

interface UpcomingDeadlinesProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onCreateSubTask?: (parentTaskId: number) => void;
  onDeleteTask?: (task: Task) => void;
  maxItems?: number;
}

// Get urgency level and styling
const getUrgencyInfo = (dueDate: Date): { label: string; color: string; icon: React.ElementType } => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (isPast(dueDate) && !isToday(dueDate)) {
    return {
      label: 'Overdue',
      color: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
      icon: AlertCircle,
    };
  }
  
  if (isToday(dueDate)) {
    return {
      label: 'Due today',
      color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
      icon: AlertCircle,
    };
  }
  
  if (isTomorrow(dueDate)) {
    return {
      label: 'Due tomorrow',
      color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
      icon: Calendar,
    };
  }
  
  const daysUntil = differenceInDays(dueDate, today);
  
  if (daysUntil <= 3) {
    return {
      label: `${daysUntil} days left`,
      color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
      icon: Calendar,
    };
  }
  
  return {
    label: `${daysUntil} days left`,
    color: 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700',
    icon: Calendar,
  };
};

export function UpcomingDeadlines({ tasks, onTaskClick, onCreateSubTask, onDeleteTask, maxItems = 5 }: UpcomingDeadlinesProps) {
  const [contextMenuState, setContextMenuState] = React.useState<{ x: number; y: number; task: Task } | null>(null);

  // Sort tasks by due date and filter for upcoming ones
  const sortedTasks = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return tasks
      .filter((task) => task.due_date && task.status !== 'done')
      .sort((a, b) => {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      })
      .slice(0, maxItems);
  }, [tasks, maxItems]);

  const closeContextMenu = React.useCallback(() => {
    setContextMenuState(null);
  }, []);

  const contextMenuItems = React.useMemo(() => {
    if (!contextMenuState) {
      return [];
    }

    const { task } = contextMenuState;
    const items = [
      {
        id: 'open-task',
        label: 'Open task',
        onSelect: () => onTaskClick?.(task),
      },
    ];

    if (onCreateSubTask) {
      items.push({
        id: 'create-sub-task',
        label: 'Add sub-task',
        onSelect: () => onCreateSubTask(task.id),
      });
    }

    if (onDeleteTask) {
      items.push({
        id: 'delete-task',
        label: 'Delete task',
        onSelect: () => onDeleteTask(task),
        danger: true,
      });
    }

    return items;
  }, [contextMenuState, onCreateSubTask, onDeleteTask, onTaskClick]);

  if (sortedTasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <CheckCircle className="w-12 h-12 text-green-500 mb-3" />
        <p className="text-gray-600 dark:text-gray-400 font-medium">
          No upcoming deadlines
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
          All tasks are completed or have no due dates
        </p>
      </div>
    );
  }

  return (
    <>
    <div className="space-y-3">
      {sortedTasks.map((task) => {
        const dueDate = new Date(task.due_date!);
        const urgencyInfo = getUrgencyInfo(dueDate);
        const UrgencyIcon = urgencyInfo.icon;
        
        return (
          <button
            key={task.id}
            onClick={() => onTaskClick?.(task)}
            onContextMenu={(event) => {
              event.preventDefault();
              setContextMenuState({ x: event.clientX, y: event.clientY, task });
            }}
            onKeyDown={(event) => {
              if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
                event.preventDefault();
                const rect = (event.currentTarget as HTMLButtonElement).getBoundingClientRect();
                setContextMenuState({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, task });
              }
            }}
            className={twMerge(
              clsx(
                'w-full text-left p-3 rounded-lg border',
                'transition-all duration-150',
                'hover:shadow-md hover:scale-[1.01]',
                'focus:outline-none focus:ring-2 focus:ring-primary-500',
                urgencyInfo.color
              )
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                  {task.title}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: PRIORITY_CONFIG[task.priority].color }}
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {PRIORITY_CONFIG[task.priority].label}
                  </span>
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0 ml-2"
                    style={{ backgroundColor: STATUS_CONFIG[task.status].color }}
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {STATUS_CONFIG[task.status].label}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end flex-shrink-0">
                <div className="flex items-center gap-1">
                  <UrgencyIcon className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">{urgencyInfo.label}</span>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {format(dueDate, 'MMM d, yyyy')}
                </span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
    <AppContextMenu
      open={Boolean(contextMenuState)}
      x={contextMenuState?.x ?? 0}
      y={contextMenuState?.y ?? 0}
      items={contextMenuItems}
      onClose={closeContextMenu}
    />
    </>
  );
}

export default UpcomingDeadlines;
