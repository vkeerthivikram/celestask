'use client';

import React, { useEffect, useState } from 'react';
import { Clock, Trash2, Edit2, X, Check, Calendar, User } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useTimeEntries } from '@/context/TimeEntryContext';
import type { TimeEntry, UpdateTimeEntryDTO } from '@/types';
import { formatDurationUsCompact } from '@/utils/timeFormat';

// Helper function to format date/time
function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// Helper function to format date for datetime-local input
function formatDateTimeLocal(isoString: string): string {
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

interface TimeEntryListProps {
  entityType: 'task' | 'project';
  entityId: number | string;
  maxHeight?: string;
}

export function TimeEntryList({ entityType, entityId, maxHeight = '300px' }: TimeEntryListProps) {
  const {
    fetchTaskTimeSummary,
    fetchProjectTimeSummary,
    updateTimeEntry,
    deleteTimeEntry,
  } = useTimeEntries();
  
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    start_time: string;
    end_time: string;
    description: string;
  }>({ start_time: '', end_time: '', description: '' });
  
  useEffect(() => {
    const fetchEntries = async () => {
      setLoading(true);
      try {
        if (entityType === 'task') {
          const summary = await fetchTaskTimeSummary(entityId);
          setEntries(summary.entries || []);
        } else {
          const summary = await fetchProjectTimeSummary(entityId);
          setEntries(summary.entries || []);
        }
      } catch (err) {
        console.error('Failed to fetch time entries:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEntries();
  }, [entityType, entityId, fetchTaskTimeSummary, fetchProjectTimeSummary]);
  
  const handleEdit = (entry: TimeEntry) => {
    setEditingId(entry.id);
    setEditForm({
      start_time: formatDateTimeLocal(entry.start_time),
      end_time: entry.end_time ? formatDateTimeLocal(entry.end_time) : '',
      description: entry.description || '',
    });
  };
  
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({ start_time: '', end_time: '', description: '' });
  };
  
  const handleSaveEdit = async () => {
    if (!editingId) return;
    
    const startTime = new Date(editForm.start_time);
    const endTime = editForm.end_time ? new Date(editForm.end_time) : null;
    
    const data: UpdateTimeEntryDTO = {
      start_time: startTime.toISOString(),
      end_time: endTime ? endTime.toISOString() : null,
      description: editForm.description || null,
    };
    
    try {
      await updateTimeEntry(editingId, data);
      
      // Update local state
      setEntries(prev => prev.map(e => {
        if (e.id === editingId) {
          return {
            ...e,
            start_time: data.start_time!,
            end_time: data.end_time || null,
            description: data.description || null,
          };
        }
        return e;
      }));
      
      setEditingId(null);
      setEditForm({ start_time: '', end_time: '', description: '' });
    } catch (err) {
      console.error('Failed to update time entry:', err);
    }
  };
  
  const handleDelete = async (entryId: string) => {
    if (!confirm('Are you sure you want to delete this time entry?')) {
      return;
    }
    
    try {
      await deleteTimeEntry(entryId);
      setEntries(prev => prev.filter(e => e.id !== entryId));
    } catch (err) {
      console.error('Failed to delete time entry:', err);
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="text-sm text-gray-500 dark:text-gray-400">Loading entries...</div>
      </div>
    );
  }
  
  if (entries.length === 0) {
    return (
      <div className="text-center py-4">
        <Clock className="w-8 h-8 mx-auto text-gray-400 dark:text-gray-500 mb-2" />
        <div className="text-sm text-gray-500 dark:text-gray-400">
          No time entries yet. Start a timer or add time manually.
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-2" style={{ maxHeight, overflowY: 'auto' }}>
      {/* Header */}
      <div className="grid grid-cols-12 gap-2 px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
        <div className="col-span-3">Date</div>
        <div className="col-span-2">Duration</div>
        <div className="col-span-5">Description</div>
        <div className="col-span-2 text-right">Actions</div>
      </div>
      
      {/* Entries */}
      {entries.map((entry) => {
        const isEditing = editingId === entry.id;
        const isRunning = entry.is_running;
        
        return (
          <div
            key={entry.id}
            className={twMerge(clsx(
              'grid grid-cols-12 gap-2 px-2 py-2 rounded items-center',
              'bg-gray-50 dark:bg-gray-800/50',
              isRunning && 'ring-1 ring-green-500 dark:ring-green-400'
            ))}
          >
            {isEditing ? (
              <>
                {/* Edit mode */}
                <div className="col-span-3">
                  <input
                    type="datetime-local"
                    value={editForm.start_time}
                    onChange={(e) => setEditForm(prev => ({ ...prev, start_time: e.target.value }))}
                    className="w-full text-xs px-1 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="datetime-local"
                    value={editForm.end_time}
                    onChange={(e) => setEditForm(prev => ({ ...prev, end_time: e.target.value }))}
                    className="w-full text-xs px-1 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                    placeholder="End"
                  />
                </div>
                <div className="col-span-4">
                  <input
                    type="text"
                    value={editForm.description}
                    onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full text-xs px-1 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                    placeholder="Description"
                  />
                </div>
                <div className="col-span-3 flex justify-end gap-1">
                  <button
                    onClick={handleSaveEdit}
                    className="p-1 rounded hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400"
                    title="Save"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500"
                    title="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* View mode */}
                <div className="col-span-3">
                  <div className="text-xs text-gray-600 dark:text-gray-300 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDateTime(entry.start_time)}
                  </div>
                </div>
                <div className="col-span-2">
                  <span className={twMerge(clsx(
                    'text-sm font-medium',
                    isRunning ? 'text-green-600 dark:text-green-400 animate-pulse' : 'text-gray-900 dark:text-gray-100'
                  ))}>
                    {isRunning ? 'Running' : formatDurationUsCompact(entry.duration_us || 0)}
                  </span>
                </div>
                <div className="col-span-5">
                  <div className="text-xs text-gray-600 dark:text-gray-300 truncate">
                    {entry.description || '-'}
                  </div>
                  {entry.person_name && (
                    <div className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {entry.person_name}
                    </div>
                  )}
                </div>
                <div className="col-span-2 flex justify-end gap-1">
                  {!isRunning && (
                    <>
                      <button
                        onClick={() => handleEdit(entry)}
                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 dark:text-red-400"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        );
      })}
      
      {/* Total */}
      <div className="grid grid-cols-12 gap-2 px-2 py-2 mt-2 border-t border-gray-200 dark:border-gray-700 font-medium">
        <div className="col-span-3 text-xs text-gray-600 dark:text-gray-300">Total</div>
        <div className="col-span-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
          {formatDurationUsCompact(entries.reduce((sum, e) => sum + (e.duration_us || 0), 0))}
        </div>
      </div>
    </div>
  );
}

export default TimeEntryList;
