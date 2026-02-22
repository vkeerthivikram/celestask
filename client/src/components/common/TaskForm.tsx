'use client';

import React, { useState, useEffect, useMemo, type FormEvent } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ClipboardList, Calendar, Flag, Loader2, User, Tag, X, Plus, Clock, GitBranch, Users, FormInput, Play, Square, Edit2, Trash2 } from 'lucide-react';
import type { Task, Project, CreateTaskDTO, UpdateTaskDTO, TaskStatus, TaskPriority, Person, Tag as TagType, CustomFieldValue, CustomField, TimeEntry, UpdateTimeEntryDTO } from '../../types';
import { STATUS_CONFIG, PRIORITY_CONFIG } from '../../types';
import { Button } from './Button';
import { TagBadge } from './Badge';
import { MiniProgressBar } from './ProgressBar';
import CustomFieldInput from './CustomFieldInput';
import { usePeople } from '../../context/PeopleContext';
import { useTags } from '../../context/TagContext';
import { useTasks } from '../../context/TaskContext';
import { useCustomFields } from '../../context/CustomFieldContext';
import { useTimeEntries } from '../../context/TimeEntryContext';
import { formatDurationUs, formatDurationUsCompact, formatTimerDisplayUs, parseDurationStringToUs, TIME_UNITS } from '@/utils/timeFormat';

interface TaskFormProps {
  task?: Task | null;
  project?: Project | null;
  projectId?: number;
  parentTaskId?: number;
  onSubmit: (data: CreateTaskDTO | UpdateTaskDTO) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

interface FormData {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string;
  start_date: string;
  end_date: string;
  assignee_id: number | null;
  parent_task_id: number | null;
  progress_percent: number;
  estimated_duration_minutes: number;
  actual_duration_minutes: number;
}

interface FormErrors {
  title?: string;
  description?: string;
  due_date?: string;
  start_date?: string;
  end_date?: string;
}

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

export function TaskForm({
  task,
  project,
  projectId: propProjectId,
  parentTaskId: propParentTaskId,
  onSubmit,
  onCancel,
  isLoading = false,
}: TaskFormProps) {
  const isEditing = Boolean(task);
  const currentProjectId = task?.project_id || propProjectId || project?.id;
  
  const { projectPeople, people } = usePeople();
  const { availableTags } = useTags();
  const { tasks } = useTasks();
  const { availableFields, fetchCustomFields, fetchTaskCustomFields, setTaskCustomField, getTaskFieldValue } = useCustomFields();
  const {
    timerTick,
    startTaskTimer,
    stopTaskTimer,
    isTaskTimerRunning,
    getRunningTimerForTask,
    fetchTaskTimeSummary,
    updateTimeEntry,
    deleteTimeEntry,
  } = useTimeEntries();
  
  // Time tracking state
  const [timeSummary, setTimeSummary] = useState<{
    total_time_us: number;
    direct_time_us: number;
    children_time_us: number;
    entries: TimeEntry[];
  } | null>(null);
  const [isTimerLoading, setIsTimerLoading] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editEntryForm, setEditEntryForm] = useState<{
    start_time: string;
    end_time: string;
    description: string;
  }>({ start_time: '', end_time: '', description: '' });
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualDuration, setManualDuration] = useState('');
  const [manualDescription, setManualDescription] = useState('');
  
  // Custom field values state (fieldId -> value)
  const [customFieldValues, setCustomFieldValues] = useState<Map<string, any>>(new Map());
  
  // Get available parent tasks (tasks from same project, excluding self and descendants)
  const availableParentTasks = useMemo(() => {
    if (!currentProjectId) return [];
    
    // Get all tasks in the same project
    return tasks.filter(t => 
      t.project_id === currentProjectId && 
      t.id !== task?.id // Can't be parent of itself
    );
  }, [tasks, currentProjectId, task?.id]);
  
  // Get available people for assignment
  const availablePeople = useMemo(() => {
    if (currentProjectId) {
      // Include both project-specific and global people
      return people.filter(p => !p.project_id || p.project_id === currentProjectId);
    }
    return people;
  }, [people, currentProjectId]);
  
  // Get tags for this project
  const tagsForProject = useMemo(() => {
    return availableTags;
  }, [availableTags]);
  
  const [formData, setFormData] = useState<FormData>({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'todo',
    priority: task?.priority || 'medium',
    due_date: task?.due_date || '',
    start_date: task?.start_date || '',
    end_date: task?.end_date || '',
    assignee_id: task?.assignee_id || null,
    parent_task_id: task?.parent_task_id || propParentTaskId || null,
    progress_percent: task?.progress_percent || 0,
    estimated_duration_minutes: task?.estimated_duration_minutes || 0,
    actual_duration_minutes: task?.actual_duration_minutes || 0,
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  
  // Co-assignees state
  const [selectedCoAssignees, setSelectedCoAssignees] = useState<Person[]>([]);
  const [showCoAssigneeSelect, setShowCoAssigneeSelect] = useState(false);
  
  // Tags state
  const [selectedTags, setSelectedTags] = useState<TagType[]>([]);
  const [showTagSelect, setShowTagSelect] = useState(false);
  
  // Fetch custom fields and values when editing
  useEffect(() => {
    if (currentProjectId) {
      fetchCustomFields(String(currentProjectId));
    }
  }, [currentProjectId, fetchCustomFields]);
  
  useEffect(() => {
    if (task) {
      fetchTaskCustomFields(task.id);
      
      // Load existing custom field values
      const loadCustomFieldValues = async () => {
        const values = new Map<string, any>();
        for (const field of availableFields) {
          const value = getTaskFieldValue(task.id, field.id);
          if (value !== undefined && value !== null) {
            values.set(field.id, value);
          }
        }
        setCustomFieldValues(values);
      };
      loadCustomFieldValues();
      
      // Load existing co-assignees
      if (task.coAssignees) {
        const coAssigneeIds = task.coAssignees.map(ca => ca.person_id);
        setSelectedCoAssignees(people.filter(p => coAssigneeIds.includes(p.id)));
      }
      
      // Load existing tags
      if (task.tags) {
        const tagIds = task.tags.map(tt => tt.tag_id);
        setSelectedTags(tagsForProject.filter(t => tagIds.includes(t.id)));
      }
    }
  }, [task, availableFields, people, tagsForProject, fetchTaskCustomFields, getTaskFieldValue]);
  
  // Fetch time tracking data when editing
  useEffect(() => {
    if (task) {
      const fetchTimeData = async () => {
        try {
          const summary = await fetchTaskTimeSummary(task.id);
          setTimeSummary({
            total_time_us: summary.total_time_us,
            direct_time_us: summary.direct_time_us,
            children_time_us: summary.children_time_us,
            entries: summary.entries,
          });
        } catch (err) {
          console.error('Failed to fetch time summary:', err);
        }
      };
      fetchTimeData();
    }
  }, [task, fetchTaskTimeSummary]);
  
  // Timer running state
  const isRunning = task ? isTaskTimerRunning(task.id) : false;
  const runningTimer = task ? getRunningTimerForTask(task.id) : undefined;
  
  // Available co-assignees (exclude primary assignee and already selected)
  const availableCoAssignees = useMemo(() => {
    return availablePeople.filter(p => 
      p.id !== formData.assignee_id &&
      !selectedCoAssignees.some(s => s.id === p.id)
    );
  }, [availablePeople, formData.assignee_id, selectedCoAssignees]);
  
  // Available tags to add
  const availableTagsToAdd = useMemo(() => {
    return tagsForProject.filter(t => 
      !selectedTags.some(s => s.id === t.id)
    );
  }, [tagsForProject, selectedTags]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    let parsedValue: string | number | null = value;
    
    if (type === 'number') {
      parsedValue = value === '' ? 0 : Number(value);
    } else if (name === 'assignee_id' || name === 'parent_task_id') {
      parsedValue = value === '' ? null : Number(value);
    }
    
    setFormData(prev => ({ ...prev, [name]: parsedValue }));
    
    // Clear error when field is modified
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };
  
  const handleCustomFieldChange = (fieldId: string, value: any) => {
    setCustomFieldValues(prev => new Map(prev).set(fieldId, value));
  };
  
  const handleAddCoAssignee = (personId: number) => {
    const person = availablePeople.find(p => p.id === personId);
    if (person && !selectedCoAssignees.some(s => s.id === personId)) {
      setSelectedCoAssignees(prev => [...prev, person]);
    }
    setShowCoAssigneeSelect(false);
  };
  
  const handleRemoveCoAssignee = (personId: number) => {
    setSelectedCoAssignees(prev => prev.filter(p => p.id !== personId));
  };
  
  const handleAddTag = (tagId: number) => {
    const tag = tagsForProject.find(t => t.id === tagId);
    if (tag && !selectedTags.some(s => s.id === tagId)) {
      setSelectedTags(prev => [...prev, tag]);
    }
    setShowTagSelect(false);
  };
  
  const handleRemoveTag = (tagId: number) => {
    setSelectedTags(prev => prev.filter(t => t.id !== tagId));
  };
  
  // Timer handlers
  const handleTimerClick = async () => {
    if (!task) return;
    
    setIsTimerLoading(true);
    try {
      if (isRunning) {
        await stopTaskTimer(task.id);
        const summary = await fetchTaskTimeSummary(task.id);
        setTimeSummary({
          total_time_us: summary.total_time_us,
          direct_time_us: summary.direct_time_us,
          children_time_us: summary.children_time_us,
          entries: summary.entries,
        });
      } else {
        await startTaskTimer(task.id);
      }
    } catch (err) {
      console.error('Timer action failed:', err);
    } finally {
      setIsTimerLoading(false);
    }
  };
  
  // Time entry edit handlers
  const handleEditEntry = (entry: TimeEntry) => {
    setEditingEntryId(entry.id);
    setEditEntryForm({
      start_time: formatDateTimeLocal(entry.start_time),
      end_time: entry.end_time ? formatDateTimeLocal(entry.end_time) : '',
      description: entry.description || '',
    });
  };
  
  const handleCancelEditEntry = () => {
    setEditingEntryId(null);
    setEditEntryForm({ start_time: '', end_time: '', description: '' });
  };
  
  const handleSaveEditEntry = async (entryId: string) => {
    const startTime = new Date(editEntryForm.start_time);
    const endTime = editEntryForm.end_time ? new Date(editEntryForm.end_time) : null;
    
    let durationUs: number | undefined;
    if (endTime) {
      durationUs = Math.round((endTime.getTime() - startTime.getTime()) * TIME_UNITS.MILLISECOND);
    }
    
    const data: UpdateTimeEntryDTO = {
      start_time: startTime.toISOString(),
      end_time: endTime ? endTime.toISOString() : null,
      duration_us: durationUs,
      description: editEntryForm.description || null,
    };
    
    try {
      await updateTimeEntry(entryId, data);
      
      // Update local state
      if (timeSummary) {
        setTimeSummary({
          ...timeSummary,
          entries: timeSummary.entries.map(e => {
            if (e.id === entryId) {
              return {
                ...e,
                start_time: data.start_time!,
                end_time: data.end_time || null,
                duration_us: durationUs || e.duration_us,
                description: data.description || null,
              };
            }
            return e;
          }),
        });
      }
      
      setEditingEntryId(null);
      setEditEntryForm({ start_time: '', end_time: '', description: '' });
    } catch (err) {
      console.error('Failed to update time entry:', err);
    }
  };
  
  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm('Are you sure you want to delete this time entry?')) {
      return;
    }
    
    try {
      await deleteTimeEntry(entryId);
      
      if (timeSummary) {
        const entry = timeSummary.entries.find(e => e.id === entryId);
        const deletedUs = entry?.duration_us || 0;
        
        setTimeSummary({
          ...timeSummary,
          total_time_us: timeSummary.total_time_us - deletedUs,
          direct_time_us: timeSummary.direct_time_us - deletedUs,
          entries: timeSummary.entries.filter(e => e.id !== entryId),
        });
      }
    } catch (err) {
      console.error('Failed to delete time entry:', err);
    }
  };
  
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    // Validate date order
    if (formData.start_date && formData.end_date) {
      if (new Date(formData.start_date) > new Date(formData.end_date)) {
        newErrors.end_date = 'End date must be after start date';
      }
    }
    
    if (formData.start_date && formData.due_date) {
      if (new Date(formData.start_date) > new Date(formData.due_date)) {
        newErrors.due_date = 'Due date must be after start date';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // Build base data
    const data: CreateTaskDTO | UpdateTaskDTO = {
      title: formData.title.trim(),
      description: formData.description.trim() || undefined,
      status: formData.status,
      priority: formData.priority,
      due_date: formData.due_date || null,
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
      assignee_id: formData.assignee_id || undefined,
      parent_task_id: formData.parent_task_id || undefined,
      progress_percent: formData.progress_percent,
      estimated_duration_minutes: formData.estimated_duration_minutes || undefined,
      actual_duration_minutes: formData.actual_duration_minutes || undefined,
    };
    
    // Add project_id for new tasks
    if (!isEditing && currentProjectId) {
      (data as CreateTaskDTO).project_id = currentProjectId;
    }
    
    await onSubmit(data);
    
    // Handle custom fields, co-assignees, and tags after submit if editing
    if (task) {
      // Save custom field values
      for (const [fieldId, value] of customFieldValues) {
        try {
          await setTaskCustomField(task.id, fieldId, value);
        } catch (err) {
          console.error('Failed to save custom field:', err);
        }
      }
      
      // Handle co-assignees
      const currentCoAssigneeIds = task.coAssignees?.map(ca => ca.person_id) || [];
      const newCoAssigneeIds = selectedCoAssignees.map(p => p.id);
      
      // We'll handle co-assignees through the task update callback
      // For now, just note that this would need additional API calls
      
      // Handle tags
      const currentTagIds = task.tags?.map(tt => tt.tag_id) || [];
      const newTagIds = selectedTags.map(t => t.id);
      
      // Same for tags - would need additional API calls
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title */}
      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={handleInputChange}
          className={twMerge(
            clsx(
              'w-full px-3 py-2 rounded-md border shadow-sm',
              'bg-white dark:bg-gray-900',
              'text-gray-900 dark:text-gray-100',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
              errors.title
                ? 'border-red-500 dark:border-red-400'
                : 'border-gray-300 dark:border-gray-600'
            )
          )}
          placeholder="Enter task title"
          disabled={isLoading}
          autoFocus
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-500 dark:text-red-400">{errors.title}</p>
        )}
      </div>
      
      {/* Description */}
      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Description
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          rows={3}
          className={twMerge(
            clsx(
              'w-full px-3 py-2 rounded-md border shadow-sm',
              'bg-white dark:bg-gray-900',
              'text-gray-900 dark:text-gray-100',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
              'border-gray-300 dark:border-gray-600',
              'resize-none'
            )
          )}
          placeholder="Add a description..."
          disabled={isLoading}
        />
      </div>
      
      {/* Parent Task */}
      {availableParentTasks.length > 0 && (
        <div>
          <label
            htmlFor="parent_task_id"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            <GitBranch className="w-4 h-4 inline-block mr-1" />
            Parent Task
          </label>
          <select
            id="parent_task_id"
            name="parent_task_id"
            value={formData.parent_task_id || ''}
            onChange={handleInputChange}
            className={twMerge(
              clsx(
                'w-full px-3 py-2 rounded-md border shadow-sm',
                'bg-white dark:bg-gray-900',
                'text-gray-900 dark:text-gray-100',
                'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
                'border-gray-300 dark:border-gray-600'
              )
            )}
            disabled={isLoading}
          >
            <option value="">No parent (root task)</option>
            {availableParentTasks.map(t => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </div>
      )}
      
      {/* Status and Priority */}
      <div className="grid grid-cols-2 gap-4">
        {/* Status */}
        <div>
          <label
            htmlFor="status"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            <ClipboardList className="w-4 h-4 inline-block mr-1" />
            Status
          </label>
          <select
            id="status"
            name="status"
            value={formData.status}
            onChange={handleInputChange}
            className={twMerge(
              clsx(
                'w-full px-3 py-2 rounded-md border shadow-sm',
                'bg-white dark:bg-gray-900',
                'text-gray-900 dark:text-gray-100',
                'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
                'border-gray-300 dark:border-gray-600'
              )
            )}
            disabled={isLoading}
          >
            {Object.entries(STATUS_CONFIG).map(([value, config]) => (
              <option key={value} value={value}>
                {config.label}
              </option>
            ))}
          </select>
        </div>
        
        {/* Priority */}
        <div>
          <label
            htmlFor="priority"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            <Flag className="w-4 h-4 inline-block mr-1" />
            Priority
          </label>
          <select
            id="priority"
            name="priority"
            value={formData.priority}
            onChange={handleInputChange}
            className={twMerge(
              clsx(
                'w-full px-3 py-2 rounded-md border shadow-sm',
                'bg-white dark:bg-gray-900',
                'text-gray-900 dark:text-gray-100',
                'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
                'border-gray-300 dark:border-gray-600'
              )
            )}
            disabled={isLoading}
          >
            {Object.entries(PRIORITY_CONFIG).map(([value, config]) => (
              <option key={value} value={value}>
                {config.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Progress Section */}
      <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-md space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            <Clock className="w-4 h-4 inline-block mr-1" />
            Progress & Duration
          </label>
          {formData.progress_percent > 0 && (
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {formData.progress_percent}%
            </span>
          )}
        </div>
        
        {/* Progress Bar */}
        <div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              id="progress_percent"
              name="progress_percent"
              min="0"
              max="100"
              value={formData.progress_percent}
              onChange={handleInputChange}
              className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
              disabled={isLoading}
            />
            <span className="text-sm text-gray-600 dark:text-gray-400 w-12 text-right">
              {formData.progress_percent}%
            </span>
          </div>
          <div className="mt-2">
            <MiniProgressBar percent={formData.progress_percent} />
          </div>
        </div>
        
        {/* Duration Fields */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="estimated_duration_minutes"
              className="block text-xs text-gray-500 dark:text-gray-400 mb-1"
            >
              Estimated (minutes)
            </label>
            <input
              type="number"
              id="estimated_duration_minutes"
              name="estimated_duration_minutes"
              min="0"
              step="15"
              value={formData.estimated_duration_minutes}
              onChange={handleInputChange}
              placeholder="0"
              className={twMerge(
                clsx(
                  'w-full px-3 py-1.5 rounded-md border shadow-sm text-sm',
                  'bg:white dark:bg-gray-900',
                  'text-gray-900 dark:text-gray-100',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
                  'border-gray-300 dark:border-gray-600'
                )
              )}
              disabled={isLoading}
            />
            {formData.estimated_duration_minutes > 0 && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                = {formatDurationUs(formData.estimated_duration_minutes * TIME_UNITS.MINUTE)}
              </p>
            )}
          </div>
          <div>
            <label
              htmlFor="actual_duration_minutes"
              className="block text-xs text-gray-500 dark:text-gray-400 mb-1"
            >
              Actual (minutes)
            </label>
            <input
              type="number"
              id="actual_duration_minutes"
              name="actual_duration_minutes"
              min="0"
              step="15"
              value={formData.actual_duration_minutes}
              onChange={handleInputChange}
              placeholder="0"
              className={twMerge(
                clsx(
                  'w-full px-3 py-1.5 rounded-md border shadow-sm text-sm',
                  'bg:white dark:bg-gray-900',
                  'text-gray-900 dark:text-gray-100',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
                  'border-gray-300 dark:border-gray-600'
                )
              )}
              disabled={isLoading}
            />
            {formData.actual_duration_minutes > 0 && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                = {formatDurationUs(formData.actual_duration_minutes * TIME_UNITS.MINUTE)}
              </p>
            )}
          </div>
        </div>
      </div>
      
      {/* Time Tracking Section - Only show for existing tasks */}
      {isEditing && task && (
        <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-md space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              <Clock className="w-4 h-4 inline-block mr-1" />
              Time Tracking
            </label>
            
            <div className="flex items-center gap-2">
              {isRunning && runningTimer ? (
                <div className="flex items-center gap-2">
                  <span className="text-lg font-mono text-green-600 dark:text-green-400 font-semibold animate-pulse">
                    {formatTimerDisplayUs(runningTimer.start_time)}
                  </span>
                  <button
                    type="button"
                    onClick={handleTimerClick}
                    disabled={isTimerLoading}
                    className={twMerge(clsx(
                      'px-3 py-1.5 rounded-md text-sm font-medium',
                      'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
                      'hover:bg-red-200 dark:hover:bg-red-900/50',
                      'disabled:opacity-50 transition-colors'
                    ))}
                  >
                    <Square className="w-4 h-4 inline mr-1" />
                    Stop
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTimerClick}
                    disabled={isTimerLoading}
                    className={twMerge(clsx(
                      'px-3 py-1.5 rounded-md text-sm font-medium',
                      'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
                      'hover:bg-green-200 dark:hover:bg-green-900/50',
                      'disabled:opacity-50 transition-colors'
                    ))}
                  >
                    <Play className="w-4 h-4 inline mr-1" />
                    Start
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowManualEntry(!showManualEntry)}
                    className={twMerge(clsx(
                      'px-3 py-1.5 rounded-md text-sm font-medium',
                      'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
                      'hover:bg-gray-200 dark:hover:bg-gray-600',
                      'transition-colors'
                    ))}
                  >
                    <Plus className="w-4 h-4 inline mr-1" />
                    Add
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Manual entry form */}
          {showManualEntry && (
            <div className="p-3 bg-white dark:bg-gray-900 rounded-md space-y-3 border border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Duration (e.g., 1h 30m, 2d, 500ms)
                  </label>
                  <input
                    type="text"
                    value={manualDuration}
                    onChange={(e) => setManualDuration(e.target.value)}
                    placeholder="1h 30m"
                    className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Description (optional)
                  </label>
                  <input
                    type="text"
                    value={manualDescription}
                    onChange={(e) => setManualDescription(e.target.value)}
                    placeholder="What did you work on?"
                    className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowManualEntry(false)}
                  className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const durationUs = parseDurationStringToUs(manualDuration);
                    if (durationUs === null || durationUs <= 0) return;
                    
                    const now = new Date();
                    const startTime = new Date(now.getTime() - (durationUs / TIME_UNITS.MILLISECOND));
                    
                    const { addManualTaskTimeEntry } = useTimeEntries();
                    try {
                      await addManualTaskTimeEntry(task.id, {
                        start_time: startTime.toISOString(),
                        end_time: now.toISOString(),
                        duration_us: durationUs,
                        description: manualDescription || undefined,
                      });
                      
                      setShowManualEntry(false);
                      setManualDuration('');
                      setManualDescription('');
                      
                      const summary = await fetchTaskTimeSummary(task.id);
                      setTimeSummary({
                        total_time_us: summary.total_time_us,
                        direct_time_us: summary.direct_time_us,
                        children_time_us: summary.children_time_us,
                        entries: summary.entries,
                      });
                    } catch (err) {
                      console.error('Failed to add manual time:', err);
                    }
                  }}
                  disabled={!manualDuration || (parseDurationStringToUs(manualDuration) ?? 0) <= 0}
                  className={twMerge(clsx(
                    'px-3 py-1 text-sm rounded',
                    'bg-primary-600 text-white',
                    'hover:bg-primary-700',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  ))}
                >
                  Add Time
                </button>
              </div>
            </div>
          )}
          
          {/* Time summary */}
          {timeSummary && (
            <div className="grid grid-cols-3 gap-2 p-2 bg-white dark:bg-gray-900/30 rounded">
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {formatDurationUs(timeSummary.direct_time_us)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Direct</div>
              </div>
              {timeSummary.children_time_us > 0 && (
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                    {formatDurationUs(timeSummary.children_time_us)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Subtasks</div>
                </div>
              )}
              <div className="text-center">
                <div className="text-lg font-semibold text-primary-600 dark:text-primary-400">
                  {formatDurationUs(timeSummary.total_time_us)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Total</div>
              </div>
            </div>
          )}
          
          {/* Time entries list */}
          {timeSummary && timeSummary.entries.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Time Entries
              </div>
              {timeSummary.entries.map((entry) => {
                const isEditingEntry = editingEntryId === entry.id;
                
                return (
                  <div
                    key={entry.id}
                    className={twMerge(clsx(
                      'p-2 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700',
                      entry.is_running && 'ring-1 ring-green-500 dark:ring-green-400'
                    ))}
                  >
                    {isEditingEntry ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="datetime-local"
                            value={editEntryForm.start_time}
                            onChange={(e) => setEditEntryForm(prev => ({ ...prev, start_time: e.target.value }))}
                            className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                          />
                          <input
                            type="datetime-local"
                            value={editEntryForm.end_time}
                            onChange={(e) => setEditEntryForm(prev => ({ ...prev, end_time: e.target.value }))}
                            className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                          />
                        </div>
                        <input
                          type="text"
                          value={editEntryForm.description}
                          onChange={(e) => setEditEntryForm(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Description"
                          className="w-full text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                        />
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={handleCancelEditEntry}
                            className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEditEntry(entry.id)}
                            className="px-2 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={twMerge(clsx(
                            'text-sm font-medium',
                            entry.is_running ? 'text-green-600 dark:text-green-400 animate-pulse' : 'text-gray-900 dark:text-gray-100'
                          ))}>
                            {entry.is_running ? 'Running' : formatDurationUs(entry.duration_us || 0)}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDateTime(entry.start_time)}
                          </span>
                          {entry.description && (
                            <span className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[100px]">
                              {entry.description}
                            </span>
                          )}
                        </div>
                        {!entry.is_running && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleEditEntry(entry)}
                              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteEntry(entry.id)}
                              className="p-1 text-gray-400 hover:text-red-500"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      
      {/* Primary Assignee */}
      <div>
        <label
          htmlFor="assignee_id"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          <User className="w-4 h-4 inline-block mr-1" />
          Primary Assignee
        </label>
        <select
          id="assignee_id"
          name="assignee_id"
          value={formData.assignee_id || ''}
          onChange={handleInputChange}
          className={twMerge(
            clsx(
              'w-full px-3 py-2 rounded-md border shadow-sm',
              'bg-white dark:bg-gray-900',
              'text-gray-900 dark:text-gray-100',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
              'border-gray-300 dark:border-gray-600'
            )
          )}
          disabled={isLoading}
        >
          <option value="">Unassigned</option>
          {availablePeople.map(person => (
            <option key={person.id} value={person.id}>
              {person.name}
              {person.designation && ` (${person.designation})`}
            </option>
          ))}
        </select>
        {formData.assignee_id && (
          <div className="mt-2 flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <span className="text-primary-600 dark:text-primary-400 text-xs font-medium">
                {availablePeople.find(p => p.id === formData.assignee_id)?.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {availablePeople.find(p => p.id === formData.assignee_id)?.name}
            </span>
          </div>
        )}
      </div>
      
      {/* Co-Assignees */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          <Users className="w-4 h-4 inline-block mr-1" />
          Co-Assignees
        </label>
        
        {/* Selected Co-Assignees */}
        {selectedCoAssignees.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {selectedCoAssignees.map(person => (
              <div
                key={person.id}
                className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-md"
              >
                <div className="w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                  <span className="text-primary-600 dark:text-primary-400 text-xs font-medium">
                    {person.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300">{person.name}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveCoAssignee(person.id)}
                  className="ml-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  disabled={isLoading}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        
        {/* Add Co-Assignee Dropdown */}
        {availableCoAssignees.length > 0 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowCoAssigneeSelect(!showCoAssigneeSelect)}
              className={twMerge(
                clsx(
                  'flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border border-dashed',
                  'text-gray-500 dark:text-gray-400',
                  'hover:border-gray-400 dark:hover:border-gray-500',
                  'hover:text-gray-700 dark:hover:text-gray-300',
                  'border-gray-300 dark:border-gray-600'
                )
              )}
              disabled={isLoading}
            >
              <Plus className="w-4 h-4" />
              Add co-assignee
            </button>
            
            {showCoAssigneeSelect && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowCoAssigneeSelect(false)}
                />
                <div className="absolute left-0 top-full mt-1 w-64 max-h-48 overflow-y-auto bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-20">
                  {availableCoAssignees.map(person => (
                    <button
                      key={person.id}
                      type="button"
                      onClick={() => handleAddCoAssignee(person.id)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <div className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                        <span className="text-primary-600 dark:text-primary-400 text-xs font-medium">
                          {person.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="text-gray-900 dark:text-gray-100">{person.name}</div>
                        {person.designation && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">{person.designation}</div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
        
        {availableCoAssignees.length === 0 && selectedCoAssignees.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400">No additional people available</p>
        )}
      </div>
      
      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          <Tag className="w-4 h-4 inline-block mr-1" />
          Tags
        </label>
        
        {/* Selected Tags */}
        {selectedTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {selectedTags.map(tag => (
              <div
                key={tag.id}
                className="flex items-center gap-1"
              >
                <TagBadge tag={tag} size="sm" />
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag.id)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  disabled={isLoading}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        
        {/* Add Tag Dropdown */}
        {availableTagsToAdd.length > 0 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTagSelect(!showTagSelect)}
              className={twMerge(
                clsx(
                  'flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border border-dashed',
                  'text-gray-500 dark:text-gray-400',
                  'hover:border-gray-400 dark:hover:border-gray-500',
                  'hover:text-gray-700 dark:hover:text-gray-300',
                  'border-gray-300 dark:border-gray-600'
                )
              )}
              disabled={isLoading}
            >
              <Plus className="w-4 h-4" />
              Add tag
            </button>
            
            {showTagSelect && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowTagSelect(false)}
                />
                <div className="absolute left-0 top-full mt-1 w-48 max-h-48 overflow-y-auto bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-20">
                  {availableTagsToAdd.map(tag => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleAddTag(tag.id)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="text-gray-900 dark:text-gray-100">{tag.name}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
        
        {availableTagsToAdd.length === 0 && selectedTags.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400">No tags available</p>
        )}
      </div>
      
      {/* Custom Fields */}
      {availableFields.length > 0 && (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            <FormInput className="w-4 h-4 inline-block mr-1" />
            Custom Fields
          </label>
          <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-md space-y-3">
            {availableFields.map(field => (
              <CustomFieldInput
                key={field.id}
                field={field}
                value={customFieldValues.get(field.id)}
                onChange={(value) => handleCustomFieldChange(field.id, value)}
                disabled={isLoading}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Date Range */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Start Date */}
        <div>
          <label
            htmlFor="start_date"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            <Calendar className="w-4 h-4 inline-block mr-1" />
            Start Date
          </label>
          <input
            type="date"
            id="start_date"
            name="start_date"
            value={formData.start_date}
            onChange={handleInputChange}
            className={twMerge(
              clsx(
                'w-full px-3 py-2 rounded-md border shadow-sm',
                'bg:white dark:bg-gray-900',
                'text-gray-900 dark:text-gray-100',
                'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
                errors.start_date
                  ? 'border-red-500 dark:border-red-400'
                  : 'border-gray-300 dark:border-gray-600'
              )
            )}
            disabled={isLoading}
          />
          {errors.start_date && (
            <p className="mt-1 text-sm text-red-500 dark:text-red-400">{errors.start_date}</p>
          )}
        </div>

        {/* End Date */}
        <div>
          <label
            htmlFor="end_date"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            <Calendar className="w-4 h-4 inline-block mr-1" />
            End Date
          </label>
          <input
            type="date"
            id="end_date"
            name="end_date"
            value={formData.end_date}
            onChange={handleInputChange}
            className={twMerge(
              clsx(
                'w-full px-3 py-2 rounded-md border shadow-sm',
                'bg:white dark:bg-gray-900',
                'text-gray-900 dark:text-gray-100',
                'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
                errors.end_date
                  ? 'border-red-500 dark:border-red-400'
                  : 'border-gray-300 dark:border-gray-600'
              )
            )}
            disabled={isLoading}
          />
          {errors.end_date && (
            <p className="mt-1 text-sm text-red-500 dark:text-red-400">{errors.end_date}</p>
          )}
        </div>
        
        {/* Due Date */}
        <div>
          <label
            htmlFor="due_date"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            <Calendar className="w-4 h-4 inline-block mr-1" />
            Due Date
          </label>
          <input
            type="date"
            id="due_date"
            name="due_date"
            value={formData.due_date}
            onChange={handleInputChange}
            className={twMerge(
              clsx(
                'w-full px-3 py-2 rounded-md border shadow-sm',
                'bg:white dark:bg-gray-900',
                'text-gray-900 dark:text-gray-100',
                'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
                errors.due_date
                  ? 'border-red-500 dark:border-red-400'
                  : 'border-gray-300 dark:border-gray-600'
              )
            )}
            disabled={isLoading}
          />
          {errors.due_date && (
            <p className="mt-1 text-sm text-red-500 dark:text-red-400">{errors.due_date}</p>
          )}
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          isLoading={isLoading}
          leftIcon={isLoading ? undefined : <ClipboardList className="w-4 h-4" />}
        >
          {isEditing ? 'Update Task' : 'Create Task'}
        </Button>
      </div>
    </form>
  );
}

export default TaskForm;
