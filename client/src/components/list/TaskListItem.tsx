'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Calendar, AlertCircle, Pencil, Trash2, ChevronRight, Plus } from 'lucide-react';
import type { Task } from '../../types';
import { StatusBadge, PriorityBadge } from '../common/Badge';
import { Button } from '../common/Button';

interface TaskListItemProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onCreateSubTask?: (parentTaskId: number) => void;
  isOverdue: boolean;
}

export function TaskListItem({ task, onEdit, onDelete, onCreateSubTask, isOverdue }: TaskListItemProps) {
  const displayDate = task.end_date || task.due_date;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const handleClick = () => {
    onEdit(task);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onEdit(task);
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(task);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(task);
  };

  const handleCreateSubTaskClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCreateSubTask?.(task.id);
  };

  return (
    <article
      className={twMerge(
        clsx(
          'relative flex flex-col p-4 rounded-lg',
          'bg-white dark:bg-gray-800',
          'border border-gray-200 dark:border-gray-700',
          'hover:border-primary-300 dark:hover:border-primary-600',
          'hover:shadow-sm',
          'cursor-pointer',
          'transition-all duration-150',
          isOverdue && 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10'
        )
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`Task: ${task.title}. Status: ${task.status}. Priority: ${task.priority}. Date: ${formatDate(displayDate)}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3
            className={twMerge(
              clsx(
                'text-sm font-semibold text-gray-900 dark:text-gray-100',
                'line-clamp-2',
                task.status === 'done' && 'line-through text-gray-500 dark:text-gray-400'
              )
            )}
          >
            {task.title}
          </h3>
          {task.description && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
              {task.description}
            </p>
          )}
        </div>
        <ChevronRight
          className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0"
          aria-hidden="true"
        />
      </div>

      {/* Badges and Date */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StatusBadge status={task.status} size="sm" />
        <PriorityBadge priority={task.priority} size="sm" />

        {displayDate && (
          <div
            className={clsx(
              'flex items-center gap-1 text-xs',
              isOverdue
                ? 'text-red-600 dark:text-red-400 font-medium'
                : 'text-gray-500 dark:text-gray-400'
            )}
          >
            {isOverdue ? (
              <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            <span>{task.end_date ? 'End ' : ''}{formatDate(displayDate)}</span>
          </div>
        )}
      </div>

      {/* Action Buttons - Visible on touch */}
      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-end gap-2">
        {onCreateSubTask && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCreateSubTaskClick}
            className="text-xs px-3 py-1.5"
            aria-label={`Add sub-task for ${task.title}`}
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
            Sub-task
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleEditClick}
          className="text-xs px-3 py-1.5"
          aria-label={`Edit ${task.title}`}
        >
          <Pencil className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
          Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDeleteClick}
          className="text-xs px-3 py-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
          aria-label={`Delete ${task.title}`}
        >
          <Trash2 className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
          Delete
        </Button>
      </div>
    </article>
  );
}

export default TaskListItem;
