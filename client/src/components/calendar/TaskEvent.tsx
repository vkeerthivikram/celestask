'use client';

import React, { useMemo, useState } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Task, TaskPriority } from '../../types';
import { PRIORITY_CONFIG } from '../../types';
import { AppContextMenu } from '../common/AppContextMenu';

interface TaskEventProps {
  task: Task;
  onClick?: (task: Task) => void;
  onCreateSubTask?: (parentTaskId: number) => void;
  onDelete?: (task: Task) => void;
}

// Get priority color for event styling
const getPriorityColorClass = (priority: TaskPriority): string => {
  const colorMap: Record<TaskPriority, string> = {
    low: 'bg-gray-500 hover:bg-gray-600',
    medium: 'bg-blue-500 hover:bg-blue-600',
    high: 'bg-amber-500 hover:bg-amber-600',
    urgent: 'bg-red-500 hover:bg-red-600',
  };
  return colorMap[priority];
};

// Get priority dot color
const getPriorityDotColor = (priority: TaskPriority): string => {
  const colorMap: Record<TaskPriority, string> = {
    low: 'bg-gray-200',
    medium: 'bg-blue-200',
    high: 'bg-amber-200',
    urgent: 'bg-red-200',
  };
  return colorMap[priority];
};

export function TaskEvent({ task, onClick, onCreateSubTask, onDelete }: TaskEventProps) {
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.(task);
  };

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenuPosition({ x: event.clientX, y: event.clientY });
  };

  const closeContextMenu = () => {
    setContextMenuPosition(null);
  };

  const contextMenuItems = useMemo(() => {
    const items = [
      {
        id: 'open-task',
        label: 'Open task',
        onSelect: () => onClick?.(task),
      },
    ];

    if (onCreateSubTask) {
      items.push({
        id: 'create-sub-task',
        label: 'Add sub-task',
        onSelect: () => onCreateSubTask(task.id),
      });
    }

    if (onDelete) {
      items.push({
        id: 'delete-task',
        label: 'Delete task',
        onSelect: () => onDelete(task),
        danger: true,
      });
    }

    return items;
  }, [onClick, onCreateSubTask, onDelete, task]);

  return (
    <>
      <div
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onKeyDown={(event) => {
          if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
            event.preventDefault();
            const rect = (event.currentTarget as HTMLDivElement).getBoundingClientRect();
            setContextMenuPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
          }
        }}
        tabIndex={0}
        role="button"
        className={twMerge(
          clsx(
            'w-full h-full px-1.5 py-0.5 rounded cursor-pointer',
            'transition-colors duration-150',
            getPriorityColorClass(task.priority)
          )
        )}
        title={`${task.title}\nPriority: ${PRIORITY_CONFIG[task.priority].label}`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {/* Priority indicator dot */}
          <span
            className={twMerge(
              clsx(
                'flex-shrink-0 w-1.5 h-1.5 rounded-full',
                getPriorityDotColor(task.priority)
              )
            )}
          />
          {/* Task title */}
          <span className="text-xs font-medium text-white truncate">
            {task.title}
          </span>
        </div>
      </div>
      <AppContextMenu
        open={Boolean(contextMenuPosition)}
        x={contextMenuPosition?.x ?? 0}
        y={contextMenuPosition?.y ?? 0}
        items={contextMenuItems}
        onClose={closeContextMenu}
      />
    </>
  );
}

export default TaskEvent;
