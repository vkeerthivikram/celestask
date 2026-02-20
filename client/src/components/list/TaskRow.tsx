'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Pencil, Trash2, Calendar, AlertCircle, Users, GitBranch, Check, Loader2 } from 'lucide-react';
import type { Task, TaskStatus, TaskPriority } from '../../types';
import { StatusBadge, PriorityBadge, TagBadge } from '../common/Badge';
import { Button } from '../common/Button';
import { MiniProgressBar } from '../common/ProgressBar';
import { useTasks } from '../../context/TaskContext';

interface TaskRowProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  isOverdue: boolean;
  isSelected?: boolean;
  onToggleSelection?: (taskId: number) => void;
}

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'done', label: 'Done' },
];

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

export function TaskRow({ 
  task, 
  onEdit, 
  onDelete, 
  isOverdue,
  isSelected = false,
  onToggleSelection,
}: TaskRowProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [editingField, setEditingField] = useState<'status' | 'priority' | 'progress' | 'title' | null>(null);
  const [editValue, setEditValue] = useState<string | number>('');
  const [isSaving, setIsSaving] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  
  const { updateTaskStatus, updateTask, updateTaskProgress } = useTasks();
  
  const titleInputRef = useRef<HTMLInputElement>(null);
  const progressInputRef = useRef<HTMLInputElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const priorityDropdownRef = useRef<HTMLDivElement>(null);

  // Focus title input when editing
  useEffect(() => {
    if (editingField === 'title' && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [editingField]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setShowStatusDropdown(false);
        setEditingField(null);
      }
      if (priorityDropdownRef.current && !priorityDropdownRef.current.contains(event.target as Node)) {
        setShowPriorityDropdown(false);
        setEditingField(null);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const handleRowClick = () => {
    if (editingField) return;
    onEdit(task);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (editingField) return;
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
  
  // Checkbox selection
  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSelection?.(task.id);
  };
  
  const handleCheckboxKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      onToggleSelection?.(task.id);
    }
  };
  
  // Status inline editing
  const handleStatusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingField('status');
    setShowStatusDropdown(true);
    setShowPriorityDropdown(false);
  };
  
  const handleStatusChange = async (status: TaskStatus) => {
    setShowStatusDropdown(false);
    setEditingField(null);
    setIsSaving(true);
    try {
      await updateTaskStatus(task.id, status);
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setIsSaving(false);
    }
  };
  
  // Priority inline editing
  const handlePriorityClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingField('priority');
    setShowPriorityDropdown(true);
    setShowStatusDropdown(false);
  };
  
  const handlePriorityChange = async (priority: TaskPriority) => {
    setShowPriorityDropdown(false);
    setEditingField(null);
    setIsSaving(true);
    try {
      await updateTask(task.id, { priority });
    } catch (error) {
      console.error('Failed to update priority:', error);
    } finally {
      setIsSaving(false);
    }
  };
  
  // Progress inline editing
  const handleProgressClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingField('progress');
    setEditValue(task.progress_percent ?? 0);
  };
  
  const handleProgressBlur = async () => {
    const newProgress = Math.min(100, Math.max(0, Number(editValue) || 0));
    setEditingField(null);
    if (newProgress !== task.progress_percent) {
      setIsSaving(true);
      try {
        await updateTaskProgress(task.id, { progress_percent: newProgress });
      } catch (error) {
        console.error('Failed to update progress:', error);
      } finally {
        setIsSaving(false);
      }
    }
  };
  
  const handleProgressKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleProgressBlur();
    } else if (e.key === 'Escape') {
      setEditingField(null);
      setEditValue('');
    }
  };
  
  // Title inline editing (double-click)
  const handleTitleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingField('title');
    setEditValue(task.title);
  };
  
  const handleTitleBlur = async () => {
    const newTitle = String(editValue).trim();
    setEditingField(null);
    if (newTitle && newTitle !== task.title) {
      setIsSaving(true);
      try {
        await updateTask(task.id, { title: newTitle });
      } catch (error) {
        console.error('Failed to update title:', error);
      } finally {
        setIsSaving(false);
      }
    }
  };
  
  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTitleBlur();
    } else if (e.key === 'Escape') {
      setEditingField(null);
      setEditValue('');
    }
  };
  
  // Get assignee info
  const primaryAssignee = task.assignee;
  const coAssigneeCount = task.coAssignees?.length || 0;
  
  // Get first few tags (max 2 visible)
  const visibleTags = task.tags?.slice(0, 2) || [];
  const remainingTagCount = (task.tags?.length || 0) - visibleTags.length;
  
  // Check if task has progress
  const hasProgress = task.progress_percent !== undefined && task.progress_percent > 0;
  
  // Check if task is a subtask
  const isSubtask = task.parent_task_id !== undefined && task.parent_task_id !== null;

  return (
    <tr
      className={twMerge(
        clsx(
          'group cursor-pointer',
          'border-b border-gray-200 dark:border-gray-700',
          'hover:bg-blue-50 dark:hover:bg-blue-900/10',
          'transition-colors duration-150',
          isOverdue && 'bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20',
          isSelected && 'bg-blue-100 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30'
        )
      )}
      onClick={handleRowClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      tabIndex={0}
      role="row"
      aria-label={`Task: ${task.title}`}
      aria-selected={isSelected}
    >
      {/* Selection Checkbox */}
      <td className="px-2 py-3 w-10">
        <div
          className={clsx(
            'w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-colors',
            isSelected
              ? 'bg-blue-600 border-blue-600'
              : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
          )}
          onClick={handleCheckboxClick}
          onKeyDown={handleCheckboxKeyDown}
          tabIndex={0}
          role="checkbox"
          aria-checked={isSelected}
          aria-label={`Select ${task.title}`}
        >
          {isSelected && (
            <Check className="w-3 h-3 text-white" aria-hidden="true" />
          )}
        </div>
      </td>

      {/* Title */}
      <td className="px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {isSubtask && (
                <GitBranch className="w-3 h-3 text-gray-400 dark:text-gray-500 flex-shrink-0" aria-hidden="true" />
              )}
              {editingField === 'title' ? (
                <input
                  ref={titleInputRef}
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={handleTitleBlur}
                  onKeyDown={handleTitleKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full px-2 py-1 text-sm border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p
                  className={twMerge(
                    clsx(
                      'text-sm font-medium text-gray-900 dark:text-gray-100',
                      'truncate',
                      task.status === 'done' && 'line-through text-gray-500 dark:text-gray-400',
                      'hover:bg-blue-100 dark:hover:bg-blue-800/30 rounded px-1 -mx-1 cursor-text'
                    )
                  )}
                  onDoubleClick={handleTitleDoubleClick}
                  title="Double-click to edit"
                >
                  {task.title}
                </p>
              )}
              {isSaving && editingField === 'title' && (
                <Loader2 className="w-3 h-3 animate-spin text-blue-500" aria-hidden="true" />
              )}
            </div>
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
        <div className="relative" ref={statusDropdownRef}>
          <button
            type="button"
            onClick={handleStatusClick}
            disabled={isSaving}
            className={clsx(
              'rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-blue-500'
            )}
            aria-label="Change status"
          >
            <StatusBadge status={task.status} size="sm" />
          </button>
          
          {showStatusDropdown && (
            <div className="absolute z-20 top-full left-0 mt-1 w-40 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1">
              {STATUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleStatusChange(option.value)}
                  className={clsx(
                    'w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700',
                    'flex items-center gap-2',
                    task.status === option.value && 'bg-blue-50 dark:bg-blue-900/30'
                  )}
                >
                  <StatusBadge status={option.value} size="sm" />
                  <span className="text-gray-700 dark:text-gray-300">{option.label}</span>
                </button>
              ))}
            </div>
          )}
          
          {isSaving && editingField === 'status' && (
            <Loader2 className="absolute -right-5 top-1/2 -translate-y-1/2 w-3 h-3 animate-spin text-blue-500" aria-hidden="true" />
          )}
        </div>
      </td>

      {/* Priority */}
      <td className="px-4 py-3">
        <div className="relative" ref={priorityDropdownRef}>
          <button
            type="button"
            onClick={handlePriorityClick}
            disabled={isSaving}
            className={clsx(
              'rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-blue-500'
            )}
            aria-label="Change priority"
          >
            <PriorityBadge priority={task.priority} size="sm" />
          </button>
          
          {showPriorityDropdown && (
            <div className="absolute z-20 top-full left-0 mt-1 w-40 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1">
              {PRIORITY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handlePriorityChange(option.value)}
                  className={clsx(
                    'w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700',
                    'flex items-center gap-2',
                    task.priority === option.value && 'bg-blue-50 dark:bg-blue-900/30'
                  )}
                >
                  <PriorityBadge priority={option.value} size="sm" />
                  <span className="text-gray-700 dark:text-gray-300">{option.label}</span>
                </button>
              ))}
            </div>
          )}
          
          {isSaving && editingField === 'priority' && (
            <Loader2 className="absolute -right-5 top-1/2 -translate-y-1/2 w-3 h-3 animate-spin text-blue-500" aria-hidden="true" />
          )}
        </div>
      </td>

      {/* Progress */}
      <td className="px-4 py-3">
        <div className="relative">
          {editingField === 'progress' ? (
            <div className="flex items-center gap-2">
              <input
                ref={progressInputRef}
                type="number"
                min="0"
                max="100"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleProgressBlur}
                onKeyDown={handleProgressKeyDown}
                onClick={(e) => e.stopPropagation()}
                className="w-16 px-2 py-1 text-sm border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <span className="text-xs text-gray-500">%</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleProgressClick}
              disabled={isSaving}
              className={clsx(
                'min-w-[80px] rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left',
                'focus:outline-none focus:ring-2 focus:ring-blue-500'
              )}
              aria-label="Change progress"
            >
              {hasProgress ? (
                <div className="flex items-center gap-2">
                  <MiniProgressBar percent={task.progress_percent!} />
                  <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                    {task.progress_percent}%
                  </span>
                </div>
              ) : (
                <span className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400">
                  Set progress
                </span>
              )}
            </button>
          )}
          
          {isSaving && editingField === 'progress' && (
            <Loader2 className="absolute -right-5 top-1/2 -translate-y-1/2 w-3 h-3 animate-spin text-blue-500" aria-hidden="true" />
          )}
        </div>
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
