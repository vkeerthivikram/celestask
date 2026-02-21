'use client';

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Task, TaskStatus } from '../../types';
import { STATUS_CONFIG } from '../../types';
import TaskCard from './TaskCard';

interface KanbanColumnProps {
  id: TaskStatus;
  title: string;
  tasks: Task[];
  projectColor?: string;
  onTaskClick?: (task: Task) => void;
  onCreateSubTask?: (parentTaskId: number) => void;
  onDeleteTask?: (task: Task) => void;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  id,
  title,
  tasks,
  projectColor,
  onTaskClick,
  onCreateSubTask,
  onDeleteTask,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: {
      type: 'column',
      status: id,
    },
  });

  const statusConfig = STATUS_CONFIG[id];
  const taskIds = tasks.map((task) => task.id);

  // Create a subtle background color based on project color
  const getColumnStyle = () => {
    if (projectColor) {
      return {
        '--column-color': projectColor,
      } as React.CSSProperties;
    }
    return {};
  };

  return (
    <div
      className={twMerge(
        clsx(
          'flex flex-col min-w-[280px] max-w-[400px] rounded-xl',
          'bg-gray-50 dark:bg-gray-800/50',
          'border border-gray-200 dark:border-gray-700',
          'transition-colors duration-200',
          isOver && 'bg-primary-50 dark:bg-primary-900/20 border-primary-300 dark:border-primary-700'
        )
      )}
      style={getColumnStyle()}
      role="region"
      aria-label={`${title} column with ${tasks.length} tasks`}
    >
      {/* Column Header - Sticky */}
      <div
        className={clsx(
          'sticky top-0 z-10 px-4 py-3 rounded-t-xl',
          'bg-gray-50/95 dark:bg-gray-800/95 backdrop-blur-sm',
          'border-b border-gray-200 dark:border-gray-700'
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Status indicator dot */}
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: statusConfig.color }}
              aria-hidden="true"
            />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </h2>
          </div>
          {/* Task count badge */}
          <span
            className={clsx(
              'inline-flex items-center justify-center',
              'min-w-[24px] h-6 px-2',
              'text-xs font-medium rounded-full',
              'bg-gray-200 dark:bg-gray-700',
              'text-gray-700 dark:text-gray-300'
            )}
          >
            {tasks.length}
          </span>
        </div>
      </div>

      {/* Tasks Container - Droppable area */}
      <div
        ref={setNodeRef}
        className={clsx(
          'flex-1 p-2 min-h-[200px]',
          'overflow-y-auto',
          // Scrollbar styling
          'scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600',
          'scrollbar-track-transparent'
        )}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onClick={onTaskClick}
                onCreateSubTask={onCreateSubTask}
                onDelete={onDeleteTask}
              />
            ))}
          </div>
        </SortableContext>

        {/* Empty state */}
        {tasks.length === 0 && (
          <div
            className={clsx(
              'flex flex-col items-center justify-center py-8 px-4',
              'text-gray-400 dark:text-gray-500'
            )}
          >
            <p className="text-sm">No tasks</p>
            <p className="text-xs mt-1 opacity-75">
              Drag tasks here to add them
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default KanbanColumn;
