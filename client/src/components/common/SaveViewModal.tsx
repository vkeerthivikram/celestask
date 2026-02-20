'use client';

import React, { useState, useEffect } from 'react';
import type { TaskFilters, CreateSavedViewDTO, SavedView } from '../../types';
import Button from './Button';
import Modal from './Modal';

interface SaveViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateSavedViewDTO) => Promise<SavedView>;
  currentFilters: TaskFilters;
  currentSortBy?: string;
  currentSortOrder: 'asc' | 'desc';
  viewType: 'list' | 'kanban' | 'calendar' | 'timeline';
  projectId?: string | null;
  existingView?: SavedView | null;
  loading?: boolean;
}

export default function SaveViewModal({
  isOpen,
  onClose,
  onSave,
  currentFilters,
  currentSortBy,
  currentSortOrder,
  viewType,
  projectId,
  existingView,
  loading = false,
}: SaveViewModalProps) {
  const [name, setName] = useState('');
  const [setAsDefault, setSetAsDefault] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!existingView;

  // Initialize form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (existingView) {
        setName(existingView.name);
        setSetAsDefault(existingView.is_default);
      } else {
        setName('');
        setSetAsDefault(false);
      }
      setError(null);
    }
  }, [isOpen, existingView]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('View name is required');
      return;
    }

    try {
      const data: CreateSavedViewDTO = {
        name: name.trim(),
        view_type: viewType,
        project_id: projectId || null,
        filters: currentFilters,
        sort_by: currentSortBy,
        sort_order: currentSortOrder,
        is_default: setAsDefault,
      };

      await onSave(data);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save view');
    }
  };

  // Count active filters for display
  const activeFilterCount = Object.entries(currentFilters).filter(
    ([key, value]) => value !== undefined && value !== null && value !== '' && 
    (Array.isArray(value) ? value.length > 0 : true)
  ).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Update Saved View' : 'Save Current View'}
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* View Name */}
        <div>
          <label
            htmlFor="view-name"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            View Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="view-name"
            value={name}
            onChange={e => setName(e.target.value)}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
              error && !name.trim() ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            }`}
            placeholder="e.g., High Priority Tasks, Due This Week"
            autoFocus
          />
          {error && !name.trim() && (
            <p className="mt-1 text-sm text-red-500">{error}</p>
          )}
        </div>

        {/* View Type Display */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            View Type
          </label>
          <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md text-sm capitalize">
            {viewType}
          </div>
        </div>

        {/* Active Filters Summary */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Filters Applied
          </label>
          <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md text-sm">
            {activeFilterCount === 0 ? (
              <span className="text-gray-500 dark:text-gray-400">No filters applied</span>
            ) : (
              <span>{activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active</span>
            )}
          </div>
          {activeFilterCount > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {currentFilters.status && (
                <FilterBadge label={`Status: ${currentFilters.status}`} />
              )}
              {currentFilters.priority && (
                <FilterBadge label={`Priority: ${currentFilters.priority}`} />
              )}
              {currentFilters.assignee_id && (
                <FilterBadge label="Assignee set" />
              )}
              {currentFilters.tag_id && (
                <FilterBadge label="Tag set" />
              )}
              {currentFilters.due_date_from && (
                <FilterBadge label={`From: ${currentFilters.due_date_from}`} />
              )}
              {currentFilters.due_date_to && (
                <FilterBadge label={`To: ${currentFilters.due_date_to}`} />
              )}
              {currentFilters.search && (
                <FilterBadge label={`Search: "${currentFilters.search}"`} />
              )}
            </div>
          )}
        </div>

        {/* Sort Settings */}
        {(currentSortBy || currentSortOrder) && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Sort
            </label>
            <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md text-sm">
              {currentSortBy ? (
                <span className="capitalize">
                  {currentSortBy.replace(/_/g, ' ')} ({currentSortOrder}ending)
                </span>
              ) : (
                <span className="text-gray-500 dark:text-gray-400">Default sort</span>
              )}
            </div>
          </div>
        )}

        {/* Set as Default */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="set-default"
            checked={setAsDefault}
            onChange={e => setSetAsDefault(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label
            htmlFor="set-default"
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Set as default view for this {projectId ? 'project' : 'view type'}
          </label>
        </div>

        {/* Error Display */}
        {error && error !== 'View name is required' && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={loading}>
            {isEditing ? 'Update View' : 'Save View'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// Helper component for filter badges
function FilterBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 text-xs rounded-md">
      {label}
    </span>
  );
}
