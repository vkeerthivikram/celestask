'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';
import { Calendar, Users, GitBranch, Plus } from 'lucide-react';
import type { Task, TaskPriority } from '../../types';
import { PriorityBadge, TagBadge } from '../common/Badge';
import { MiniProgressBar } from '../common/ProgressBar';

interface TaskCardProps {
  task: Task;
  onClick?: (task: Task) => void;
  onCreateSubTask?: (parentTaskId: number) => void;
}

const priorityColors: Record<TaskPriority, string> = {
  low: 'bg-gray-400',
  medium: 'bg-blue-500',
  high: 'bg-amber-500',
  urgent: 'bg-red-500',
};

export const TaskCard: React.FC<TaskCardProps> = ({ task, onClick, onCreateSubTask }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: 'task',
      task,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleClick = () => {
    onClick?.(task);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.(task);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d');
    } catch {
      return dateString;
    }
  };

  const displayDate = task.end_date || task.due_date;
  const isOverdue = displayDate && new Date(displayDate) < new Date();
  
  // Get assignee info
  const primaryAssignee = task.assignee;
  const coAssigneeCount = task.coAssignees?.length || 0;
  const totalAssignees = (primaryAssignee ? 1 : 0) + coAssigneeCount;
  
  // Get first few tags (max 3 visible)
  const visibleTags = task.tags?.slice(0, 3) || [];
  const remainingTagCount = (task.tags?.length || 0) - visibleTags.length;
  
  // Check if task has progress
  const hasProgress = task.progress_percent !== undefined && task.progress_percent > 0;
  
  // Check if task has parent (is a subtask)
  const isSubtask = task.parent_task_id !== undefined && task.parent_task_id !== null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`Task: ${task.title}`}
      className={twMerge(
        clsx(
          'group relative bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700',
          'min-h-[80px] p-3 cursor-pointer select-none',
          'transition-all duration-200 ease-in-out',
          'hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900',
          'hover:-translate-y-0.5',
          isDragging && [
            'opacity-50 scale-[1.02] rotate-[2deg]',
            'shadow-xl border-primary-400 dark:border-primary-500',
          ]
        )
      )}
    >
      {/* Priority indicator bar on left edge */}
      <div
        className={clsx(
          'absolute left-0 top-0 bottom-0 w-1 rounded-l-lg',
          priorityColors[task.priority]
        )}
        aria-hidden="true"
      />

      {onCreateSubTask && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onCreateSubTask(task.id);
          }}
          className="absolute top-2 right-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 p-1 rounded text-gray-400 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          title="Add sub-task"
          aria-label="Add sub-task"
        >
          <Plus className="w-4 h-4" />
        </button>
      )}

      {/* Card content */}
      <div className="pl-2">

        {/* Subtask indicator */}
        {isSubtask && (
          <div className="flex items-center gap-1 mb-1 text-xs text-gray-400 dark:text-gray-500">
            <GitBranch className="w-3 h-3" aria-hidden="true" />
            <span>Subtask</span>
          </div>
        )}
        
        {/* Title */}
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2 line-clamp-2">
          {task.title}
        </h3>

        {/* Tags - Show above meta info if present */}
        {visibleTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 mb-2">
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
              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                +{remainingTagCount}
              </span>
            )}
          </div>
        )}

        {/* Progress Bar - Show if progress > 0 */}
        {hasProgress && (
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500 dark:text-gray-400">Progress</span>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                {task.progress_percent}%
              </span>
            </div>
            <MiniProgressBar percent={task.progress_percent!} />
          </div>
        )}

        {/* Meta info */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Priority badge */}
          <PriorityBadge priority={task.priority} size="sm" />

          {/* End/Due date */}
          {displayDate && (
            <span
              className={clsx(
                'inline-flex items-center gap-1 text-xs',
                isOverdue
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-gray-500 dark:text-gray-400'
              )}
            >
              <Calendar className="w-3 h-3" aria-hidden="true" />
              {task.end_date ? 'End ' : ''}{formatDate(displayDate)}
            </span>
          )}

          {/* Assignees */}
          {totalAssignees > 0 && (
            <div className="flex items-center gap-1 ml-auto">
              {/* Primary assignee avatar */}
              {primaryAssignee && (
                <div
                  className="w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center"
                  title={primaryAssignee.name}
                >
                  <span className="text-primary-600 dark:text-primary-400 text-[10px] font-medium">
                    {primaryAssignee.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              
              {/* Co-assignee count indicator */}
              {coAssigneeCount > 0 && (
                <div
                  className="flex items-center gap-0.5 text-xs text-gray-500 dark:text-gray-400"
                  title={`${coAssigneeCount} co-assignee${coAssigneeCount > 1 ? 's' : ''}`}
                >
                  <Users className="w-3 h-3" aria-hidden="true" />
                  <span>{coAssigneeCount}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
