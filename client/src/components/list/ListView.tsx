'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Inbox, Loader2, Check } from 'lucide-react';
import { useTasks } from '../../context/TaskContext';
import { useApp } from '../../context/AppContext';
import type { Task, TaskStatus, TaskPriority } from '../../types';
import { FilterBar, type ListFilters } from './FilterBar';
import { TaskRow } from './TaskRow';
import { TaskListItem } from './TaskListItem';
import { SortHeader, type SortKey, type SortOrder } from './SortHeader';
import { Modal } from '../common/Modal';
import { ConfirmModal } from '../common/Modal';
import { TaskForm } from '../common/TaskForm';
import { BulkActionBar } from '../common/BulkActionBar';
import type { CreateTaskDTO, UpdateTaskDTO } from '../../types';

const DEFAULT_FILTERS: ListFilters = {
  search: '',
  status: [],
  priority: [],
  assignee_id: '',
  tag_id: '',
};

const DEFAULT_SORT: { sortBy: SortKey; sortOrder: SortOrder } = {
  sortBy: 'created_at',
  sortOrder: 'desc',
};

// Priority weight for sorting
const PRIORITY_WEIGHT: Record<TaskPriority, number> = {
  low: 1,
  medium: 2,
  high: 3,
  urgent: 4,
};

// Status weight for sorting (done should be at bottom)
const STATUS_WEIGHT: Record<TaskStatus, number> = {
  backlog: 1,
  todo: 2,
  in_progress: 3,
  review: 4,
  done: 5,
};

export function ListView() {
  const { 
    tasks, 
    loading, 
    error, 
    updateTask, 
    deleteTask,
    selectedTaskIds,
    isTaskSelected,
    isAllSelected,
    isPartialSelected,
    toggleTaskSelection,
    selectAllTasks,
    clearSelection,
    bulkUpdateTasks,
    bulkDeleteTasks,
  } = useTasks();
  const { currentProjectId, closeModal, modal } = useApp();

  // Local state for filters and sorting
  const [filters, setFilters] = useState<ListFilters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState(DEFAULT_SORT);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Apply client-side filtering
  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    // Filter by search
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(
        t =>
          t.title.toLowerCase().includes(searchLower) ||
          t.description.toLowerCase().includes(searchLower)
      );
    }

    // Filter by status (multiple selection)
    if (filters.status.length > 0) {
      result = result.filter(t => filters.status.includes(t.status));
    }

    // Filter by priority (multiple selection)
    if (filters.priority.length > 0) {
      result = result.filter(t => filters.priority.includes(t.priority));
    }

    return result;
  }, [tasks, filters]);

  // Apply sorting
  const sortedTasks = useMemo(() => {
    const { sortBy, sortOrder } = sort;
    const sorted = [...filteredTasks];

    sorted.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'status':
          comparison = STATUS_WEIGHT[a.status] - STATUS_WEIGHT[b.status];
          break;
        case 'priority':
          comparison = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
          break;
        case 'due_date':
          // Tasks without due date go to the end
          if (!a.due_date && !b.due_date) comparison = 0;
          else if (!a.due_date) comparison = 1;
          else if (!b.due_date) comparison = -1;
          else comparison = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
          break;
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [filteredTasks, sort]);

  // Handle sort toggle
  const handleSort = useCallback((sortKey: SortKey) => {
    setSort(prev => ({
      sortBy: sortKey,
      sortOrder: prev.sortBy === sortKey && prev.sortOrder === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  // Check if task is overdue
  const isTaskOverdue = useCallback((task: Task): boolean => {
    if (!task.due_date || task.status === 'done') return false;
    const dueDate = new Date(task.due_date);
    const now = new Date();
    dueDate.setHours(23, 59, 59, 999);
    return dueDate < now;
  }, []);

  // Handle edit task
  const handleEditTask = useCallback((task: Task) => {
    setEditingTask(task);
  }, []);

  // Handle delete task
  const handleDeleteTask = useCallback((task: Task) => {
    setDeletingTask(task);
  }, []);

  // Submit task update
  const handleTaskSubmit = async (data: CreateTaskDTO | UpdateTaskDTO) => {
    if (!editingTask) return;
    setIsSubmitting(true);
    try {
      await updateTask(editingTask.id, data as UpdateTaskDTO);
      setEditingTask(null);
    } catch (err) {
      console.error('Failed to update task:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirm delete
  const handleConfirmDelete = async () => {
    if (!deletingTask) return;
    setIsSubmitting(true);
    try {
      await deleteTask(deletingTask.id);
      setDeletingTask(null);
    } catch (err) {
      console.error('Failed to delete task:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle select all toggle
  const handleSelectAll = useCallback(() => {
    if (isAllSelected) {
      clearSelection();
    } else {
      selectAllTasks();
    }
  }, [isAllSelected, selectAllTasks, clearSelection]);

  // Bulk operations
  const handleBulkStatusChange = useCallback(async (status: TaskStatus) => {
    await bulkUpdateTasks({ status });
  }, [bulkUpdateTasks]);

  const handleBulkPriorityChange = useCallback(async (priority: TaskPriority) => {
    await bulkUpdateTasks({ priority });
  }, [bulkUpdateTasks]);

  const handleBulkAssigneeChange = useCallback(async (assigneeId: number | null) => {
    await bulkUpdateTasks({ assignee_id: assigneeId });
  }, [bulkUpdateTasks]);

  const handleBulkDelete = useCallback(async () => {
    await bulkDeleteTasks();
  }, [bulkDeleteTasks]);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400">Loading tasks...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center max-w-md p-6 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="text-red-600 dark:text-red-400 mb-2">Error loading tasks</p>
          <p className="text-sm text-red-500 dark:text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  const selectedCount = selectedTaskIds.length;

  return (
    <div className="h-full flex flex-col pb-16">
      {/* Filter Bar */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <FilterBar
          filters={filters}
          onFilterChange={setFilters}
          totalTasks={tasks.length}
          filteredCount={sortedTasks.length}
        />
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-auto">
        {sortedTasks.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-8">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
              <Inbox className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {tasks.length === 0 ? 'No tasks yet' : 'No tasks match your filters'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-sm">
              {tasks.length === 0
                ? 'Create your first task to get started with your project.'
                : 'Try adjusting your search or filter criteria to find what you\'re looking for.'}
            </p>
            {tasks.length > 0 && (filters.search || filters.status.length > 0 || filters.priority.length > 0) && (
              <button
                onClick={() => setFilters(DEFAULT_FILTERS)}
                className="mt-4 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[640px]" role="grid">
                <thead>
                  <tr>
                    {/* Select All Checkbox */}
                    <th
                      className="sticky top-0 z-10 px-2 py-3 text-left bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700 w-10"
                      scope="col"
                    >
                      <div
                        className={clsx(
                          'w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-colors',
                          isAllSelected
                            ? 'bg-blue-600 border-blue-600'
                            : isPartialSelected
                            ? 'bg-blue-600 border-blue-600'
                            : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
                        )}
                        onClick={handleSelectAll}
                        role="checkbox"
                        aria-checked={isAllSelected}
                        aria-label="Select all tasks"
                      >
                        {isAllSelected ? (
                          <Check className="w-3 h-3 text-white" aria-hidden="true" />
                        ) : isPartialSelected ? (
                          <Check className="w-3 h-3 text-white" aria-hidden="true" />
                        ) : null}
                      </div>
                    </th>
                    <SortHeader
                      label="Title"
                      sortKey="title"
                      currentSort={sort.sortBy}
                      sortOrder={sort.sortOrder}
                      onSort={handleSort}
                      className="min-w-[250px]"
                    />
                    <SortHeader
                      label="Status"
                      sortKey="status"
                      currentSort={sort.sortBy}
                      sortOrder={sort.sortOrder}
                      onSort={handleSort}
                      className="w-32"
                    />
                    <SortHeader
                      label="Priority"
                      sortKey="priority"
                      currentSort={sort.sortBy}
                      sortOrder={sort.sortOrder}
                      onSort={handleSort}
                      className="w-28"
                    />
                    <th
                      className="sticky top-0 z-10 px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700"
                      scope="col"
                    >
                      Progress
                    </th>
                    <th
                      className="sticky top-0 z-10 px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700"
                      scope="col"
                    >
                      Assignee
                    </th>
                    <th
                      className="sticky top-0 z-10 px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700"
                      scope="col"
                    >
                      Tags
                    </th>
                    <SortHeader
                      label="Due Date"
                      sortKey="due_date"
                      currentSort={sort.sortBy}
                      sortOrder={sort.sortOrder}
                      onSort={handleSort}
                      className="w-36"
                    />
                    <th
                      className="sticky top-0 z-10 px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700"
                      scope="col"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTasks.map(task => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      onEdit={handleEditTask}
                      onDelete={handleDeleteTask}
                      isOverdue={isTaskOverdue(task)}
                      isSelected={isTaskSelected(task.id)}
                      onToggleSelection={toggleTaskSelection}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden p-4 space-y-3">
              {sortedTasks.map(task => (
                <TaskListItem
                  key={task.id}
                  task={task}
                  onEdit={handleEditTask}
                  onDelete={handleDeleteTask}
                  isOverdue={isTaskOverdue(task)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Edit Task Modal */}
      <Modal
        isOpen={editingTask !== null}
        onClose={() => setEditingTask(null)}
        title="Edit Task"
        size="lg"
      >
        {editingTask && (
          <TaskForm
            task={editingTask}
            projectId={currentProjectId || undefined}
            onSubmit={handleTaskSubmit}
            onCancel={() => setEditingTask(null)}
            isLoading={isSubmitting}
          />
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deletingTask !== null}
        onClose={() => setDeletingTask(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Task"
        message={`Are you sure you want to delete "${deletingTask?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isSubmitting}
      />

      {/* Bulk Action Bar */}
      {selectedCount > 0 && (
        <BulkActionBar
          selectedCount={selectedCount}
          onStatusChange={handleBulkStatusChange}
          onPriorityChange={handleBulkPriorityChange}
          onAssigneeChange={handleBulkAssigneeChange}
          onDelete={handleBulkDelete}
          onClearSelection={clearSelection}
        />
      )}
    </div>
  );
}

export default ListView;
