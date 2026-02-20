'use client';

import React, { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { X, Trash2, ChevronDown, Check, Loader2 } from 'lucide-react';
import type { TaskStatus, TaskPriority } from '../../types';
import { StatusBadge, PriorityBadge } from './Badge';
import { usePeople } from '../../context/PeopleContext';
import { useToast } from '../../context/ToastContext';

interface BulkActionBarProps {
  selectedCount: number;
  onStatusChange: (status: TaskStatus) => Promise<void>;
  onPriorityChange: (priority: TaskPriority) => Promise<void>;
  onAssigneeChange: (assigneeId: number | null) => Promise<void>;
  onDelete: () => Promise<void>;
  onClearSelection: () => void;
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

export function BulkActionBar({
  selectedCount,
  onStatusChange,
  onPriorityChange,
  onAssigneeChange,
  onDelete,
  onClearSelection,
}: BulkActionBarProps) {
  const { people } = usePeople();
  const { success: toastSuccess, error: toastError } = useToast();
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<'status' | 'priority' | 'assignee' | 'delete' | null>(null);

  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const priorityDropdownRef = useRef<HTMLDivElement>(null);
  const assigneeDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setShowStatusDropdown(false);
      }
      if (priorityDropdownRef.current && !priorityDropdownRef.current.contains(event.target as Node)) {
        setShowPriorityDropdown(false);
      }
      if (assigneeDropdownRef.current && !assigneeDropdownRef.current.contains(event.target as Node)) {
        setShowAssigneeDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleStatusChange = async (status: TaskStatus) => {
    setShowStatusDropdown(false);
    setIsLoading(true);
    setLoadingAction('status');
    try {
      await onStatusChange(status);
      toastSuccess(`Updated status to "${status}" for ${selectedCount} task${selectedCount !== 1 ? 's' : ''}`);
    } catch (error) {
      toastError('Failed to update status');
    } finally {
      setIsLoading(false);
      setLoadingAction(null);
    }
  };

  const handlePriorityChange = async (priority: TaskPriority) => {
    setShowPriorityDropdown(false);
    setIsLoading(true);
    setLoadingAction('priority');
    try {
      await onPriorityChange(priority);
      toastSuccess(`Updated priority to "${priority}" for ${selectedCount} task${selectedCount !== 1 ? 's' : ''}`);
    } catch (error) {
      toastError('Failed to update priority');
    } finally {
      setIsLoading(false);
      setLoadingAction(null);
    }
  };

  const handleAssigneeChange = async (assigneeId: number | null) => {
    setShowAssigneeDropdown(false);
    setIsLoading(true);
    setLoadingAction('assignee');
    try {
      await onAssigneeChange(assigneeId);
      const assigneeName = assigneeId 
        ? people.find(p => p.id === assigneeId)?.name || 'Unknown'
        : 'Unassigned';
      toastSuccess(`Assigned ${selectedCount} task${selectedCount !== 1 ? 's' : ''} to "${assigneeName}"`);
    } catch (error) {
      toastError('Failed to update assignee');
    } finally {
      setIsLoading(false);
      setLoadingAction(null);
    }
  };

  const handleDelete = async () => {
    setShowDeleteConfirm(false);
    setIsLoading(true);
    setLoadingAction('delete');
    try {
      await onDelete();
      toastSuccess(`Deleted ${selectedCount} task${selectedCount !== 1 ? 's' : ''}`);
    } catch (error) {
      toastError('Failed to delete tasks');
    } finally {
      setIsLoading(false);
      setLoadingAction(null);
    }
  };

  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Selection Info */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {selectedCount} task{selectedCount !== 1 ? 's' : ''} selected
          </span>
          <button
            onClick={onClearSelection}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline"
          >
            Clear selection
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Status Dropdown */}
          <div className="relative" ref={statusDropdownRef}>
            <button
              onClick={() => {
                setShowStatusDropdown(!showStatusDropdown);
                setShowPriorityDropdown(false);
                setShowAssigneeDropdown(false);
              }}
              disabled={isLoading}
              className={twMerge(
                clsx(
                  'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border border-gray-300 dark:border-gray-600',
                  'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200',
                  'hover:bg-gray-50 dark:hover:bg-gray-600',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )
              )}
            >
              {loadingAction === 'status' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Status
                  <ChevronDown className="w-4 h-4" />
                </>
              )}
            </button>
            
            {showStatusDropdown && (
              <div className="absolute bottom-full mb-1 left-0 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1 max-h-64 overflow-auto">
                {STATUS_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleStatusChange(option.value)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <StatusBadge status={option.value} size="sm" />
                    <span className="text-gray-700 dark:text-gray-300">{option.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Priority Dropdown */}
          <div className="relative" ref={priorityDropdownRef}>
            <button
              onClick={() => {
                setShowPriorityDropdown(!showPriorityDropdown);
                setShowStatusDropdown(false);
                setShowAssigneeDropdown(false);
              }}
              disabled={isLoading}
              className={twMerge(
                clsx(
                  'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border border-gray-300 dark:border-gray-600',
                  'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200',
                  'hover:bg-gray-50 dark:hover:bg-gray-600',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )
              )}
            >
              {loadingAction === 'priority' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Priority
                  <ChevronDown className="w-4 h-4" />
                </>
              )}
            </button>
            
            {showPriorityDropdown && (
              <div className="absolute bottom-full mb-1 left-0 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1 max-h-64 overflow-auto">
                {PRIORITY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handlePriorityChange(option.value)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <PriorityBadge priority={option.value} size="sm" />
                    <span className="text-gray-700 dark:text-gray-300">{option.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Assignee Dropdown */}
          <div className="relative" ref={assigneeDropdownRef}>
            <button
              onClick={() => {
                setShowAssigneeDropdown(!showAssigneeDropdown);
                setShowStatusDropdown(false);
                setShowPriorityDropdown(false);
              }}
              disabled={isLoading}
              className={twMerge(
                clsx(
                  'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border border-gray-300 dark:border-gray-600',
                  'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200',
                  'hover:bg-gray-50 dark:hover:bg-gray-600',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )
              )}
            >
              {loadingAction === 'assignee' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Assign
                  <ChevronDown className="w-4 h-4" />
                </>
              )}
            </button>
            
            {showAssigneeDropdown && (
              <div className="absolute bottom-full mb-1 left-0 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1 max-h-64 overflow-auto">
                {/* Unassign option */}
                <button
                  onClick={() => handleAssigneeChange(null)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 italic"
                >
                  Unassigned
                </button>
                
                {/* Divider */}
                <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                
                {/* People list */}
                {people.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                    No people available
                  </div>
                ) : (
                  people.map((person) => (
                    <button
                      key={person.id}
                      onClick={() => handleAssigneeChange(person.id)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <div className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary-600 dark:text-primary-400 text-xs font-medium">
                          {person.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-gray-700 dark:text-gray-300 truncate">{person.name}</p>
                        {person.email && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{person.email}</p>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Delete Button */}
          <div className="relative">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isLoading}
              className={twMerge(
                clsx(
                  'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border',
                  'border-red-300 dark:border-red-700',
                  'bg-white dark:bg-gray-700 text-red-600 dark:text-red-400',
                  'hover:bg-red-50 dark:hover:bg-red-900/20',
                  'focus:outline-none focus:ring-2 focus:ring-red-500',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )
              )}
            >
              {loadingAction === 'delete' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Delete
                </>
              )}
            </button>
            
            {/* Delete Confirmation */}
            {showDeleteConfirm && (
              <div className="absolute bottom-full mb-2 right-0 w-72 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                  Are you sure you want to delete {selectedCount} task{selectedCount !== 1 ? 's' : ''}? This action cannot be undone.
                </p>
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isLoading}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Close Button */}
          <button
            onClick={onClearSelection}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Clear selection"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default BulkActionBar;
