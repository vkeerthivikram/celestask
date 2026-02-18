import React, { useState } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Pencil, Trash2, Calendar, AlertCircle, Users } from 'lucide-react';
import type { Task } from '../../types';
import { StatusBadge, PriorityBadge, TagBadge } from '../common/Badge';
import { Button } from '../common/Button';

interface TaskRowProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  isOverdue: boolean;
}

export function TaskRow({ task, onEdit, onDelete, isOverdue }: TaskRowProps) {
  const [isHovered, setIsHovered] = useState(false);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Show relative date for nearby dates
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';

    // Otherwise show formatted date
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const handleRowClick = () => {
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
  
  // Get assignee info
  const primaryAssignee = task.assignee;
  const coAssigneeCount = task.coAssignees?.length || 0;
  
  // Get first few tags (max 2 visible)
  const visibleTags = task.tags?.slice(0, 2) || [];
  const remainingTagCount = (task.tags?.length || 0) - visibleTags.length;

  return (
    <tr
      className={twMerge(
        clsx(
          'group cursor-pointer',
          'border-b border-gray-200 dark:border-gray-700',
          'hover:bg-blue-50 dark:hover:bg-blue-900/10',
          'transition-colors duration-150',
          isOverdue && 'bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20'
        )
      )}
      onClick={handleRowClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      tabIndex={0}
      role="row"
      aria-label={`Task: ${task.title}`}
    >
      {/* Title */}
      <td className="px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p
              className={twMerge(
                clsx(
                  'text-sm font-medium text-gray-900 dark:text-gray-100',
                  'truncate',
                  task.status === 'done' && 'line-through text-gray-500 dark:text-gray-400'
                )
              )}
            >
              {task.title}
            </p>
            {task.description && (
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate max-w-md">
                {task.description}
              </p>
            )}
          </div>
        </div>
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <StatusBadge status={task.status} size="sm" />
      </td>

      {/* Priority */}
      <td className="px-4 py-3">
        <PriorityBadge priority={task.priority} size="sm" />
      </td>

      {/* Assignee */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {primaryAssignee ? (
            <>
              <div
                className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0"
                title={primaryAssignee.name}
              >
                <span className="text-primary-600 dark:text-primary-400 text-xs font-medium">
                  {primaryAssignee.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-[100px]">
                {primaryAssignee.name}
              </span>
              {coAssigneeCount > 0 && (
                <div
                  className="flex items-center gap-0.5 text-xs text-gray-500 dark:text-gray-400"
                  title={`${coAssigneeCount} co-assignee${coAssigneeCount > 1 ? 's' : ''}`}
                >
                  <Users className="w-3 h-3" aria-hidden="true" />
                  <span>+{coAssigneeCount}</span>
                </div>
              )}
            </>
          ) : (
            <span className="text-sm text-gray-400 dark:text-gray-500">Unassigned</span>
          )}
        </div>
      </td>

      {/* Tags */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 flex-wrap">
          {visibleTags.length > 0 ? (
            <>
              {visibleTags.map((taskTag) => (
                taskTag.tag && (
                  <TagBadge
                    key={taskTag.id}
                    tag={taskTag.tag}
                    size="sm"
                    className="text-[10px]"
                  />
                )
              ))}
              {remainingTagCount > 0 && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  +{remainingTagCount}
                </span>
              )}
            </>
          ) : (
            <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
          )}
        </div>
      </td>

      {/* Due Date */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {isOverdue && (
            <AlertCircle
              className="w-4 h-4 text-red-500 dark:text-red-400 flex-shrink-0"
              aria-hidden="true"
            />
          )}
          {task.due_date && (
            <Calendar
              className={clsx(
                'w-4 h-4 flex-shrink-0',
                isOverdue
                  ? 'text-red-400 dark:text-red-500'
                  : 'text-gray-400 dark:text-gray-500'
              )}
              aria-hidden="true"
            />
          )}
          <span
            className={twMerge(
              clsx(
                'text-sm',
                isOverdue
                  ? 'text-red-600 dark:text-red-400 font-medium'
                  : 'text-gray-600 dark:text-gray-400'
              )
            )}
          >
            {formatDate(task.due_date)}
          </span>
        </div>
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div
          className={clsx(
            'flex items-center gap-1 transition-opacity duration-150',
            isHovered ? 'opacity-100' : 'opacity-0 sm:opacity-0'
          )}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={handleEditClick}
            className="p-1.5"
            aria-label={`Edit ${task.title}`}
          >
            <Pencil className="w-4 h-4" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDeleteClick}
            className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
            aria-label={`Delete ${task.title}`}
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

export default TaskRow;
