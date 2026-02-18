import React, { useState, useEffect, useMemo, type FormEvent } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ClipboardList, Calendar, Flag, Loader2, User, Tag, X, Plus } from 'lucide-react';
import type { Task, Project, CreateTaskDTO, UpdateTaskDTO, TaskStatus, TaskPriority, Person, Tag as TagType } from '../../types';
import { STATUS_CONFIG, PRIORITY_CONFIG } from '../../types';
import { Button } from './Button';
import { StatusBadge, PriorityBadge, TagBadge } from './Badge';
import { usePeople } from '../../context/PeopleContext';
import { useTags } from '../../context/TagContext';

interface TaskFormProps {
  task?: Task | null;
  project?: Project | null;
  projectId?: number;
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
  assignee_id: string;
}

interface FormErrors {
  title?: string;
  description?: string;
  due_date?: string;
  start_date?: string;
}

export function TaskForm({
  task,
  project,
  projectId: propProjectId,
  onSubmit,
  onCancel,
  isLoading = false,
}: TaskFormProps) {
  const isEditing = Boolean(task);
  const currentProjectId = task?.project_id || propProjectId || project?.id;
  
  const { projectPeople, people } = usePeople();
  const { availableTags } = useTags();
  
  // Get available people for assignment
  const availablePeople = useMemo(() => {
    if (currentProjectId) {
      // Include both project-specific and global people
      return people.filter(p => !p.project_id || p.project_id === currentProjectId);
    }
    return people;
  }, [people, currentProjectId]);
  
  // Get available tags for this project
  const tagsForProject = useMemo(() => {
    if (currentProjectId) {
      return availableTags(currentProjectId);
    }
    return [];
  }, [availableTags, currentProjectId]);
  
  const [formData, setFormData] = useState<FormData>({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'todo',
    priority: task?.priority || 'medium',
    due_date: task?.due_date ? task.due_date.split('T')[0] : '',
    start_date: task?.start_date ? task.start_date.split('T')[0] : '',
    assignee_id: task?.assignee_id || '',
  });
  
  // Selected co-assignees and tags (for editing existing task)
  const [selectedCoAssignees, setSelectedCoAssignees] = useState<Person[]>([]);
  const [selectedTags, setSelectedTags] = useState<TagType[]>([]);
  
  // UI state for dropdowns
  const [showCoAssigneeSelect, setShowCoAssigneeSelect] = useState(false);
  const [showTagSelect, setShowTagSelect] = useState(false);
  
  const [errors, setErrors] = useState<FormErrors>({});
  
  // Initialize co-assignees and tags when editing
  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        due_date: task.due_date ? task.due_date.split('T')[0] : '',
        start_date: task.start_date ? task.start_date.split('T')[0] : '',
        assignee_id: task.assignee_id || '',
      });
      
      // Set co-assignees from task
      if (task.coAssignees && task.coAssignees.length > 0) {
        const coAssigneePeople = task.coAssignees
          .map(ca => ca.person)
          .filter((p): p is Person => p !== undefined);
        setSelectedCoAssignees(coAssigneePeople);
      }
      
      // Set tags from task
      if (task.tags && task.tags.length > 0) {
        const taskTags = task.tags
          .map(tt => tt.tag)
          .filter((t): t is TagType => t !== undefined);
        setSelectedTags(taskTags);
      }
    }
  }, [task]);
  
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Task title is required';
    } else if (formData.title.length > 200) {
      newErrors.title = 'Task title must be less than 200 characters';
    }
    
    if (formData.description.length > 2000) {
      newErrors.description = 'Description must be less than 2000 characters';
    }
    
    // Validate date range
    if (formData.start_date && formData.due_date) {
      const startDate = new Date(formData.start_date);
      const dueDate = new Date(formData.due_date);
      
      if (startDate > dueDate) {
        newErrors.start_date = 'Start date cannot be after due date';
        newErrors.due_date = 'Due date cannot be before start date';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      const data = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        status: formData.status,
        priority: formData.priority,
        due_date: formData.due_date || null,
        start_date: formData.start_date || null,
        assignee_id: formData.assignee_id || null,
        // Include tag IDs for new tasks
        tag_ids: selectedTags.map(t => t.id),
        // Include co-assignee IDs for new tasks
        co_assignee_ids: selectedCoAssignees.map(p => p.id),
        ...(isEditing ? {} : { project_id: currentProjectId }),
      };
      
      if (isEditing) {
        await onSubmit(data as UpdateTaskDTO);
      } else {
        await onSubmit(data as CreateTaskDTO);
      }
    } catch {
      // Error handling is done by the parent component
    }
  };
  
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };
  
  // Add co-assignee
  const handleAddCoAssignee = (personId: string) => {
    const person = availablePeople.find(p => p.id === personId);
    if (person && !selectedCoAssignees.find(p => p.id === personId)) {
      // Don't add if already primary assignee
      if (formData.assignee_id !== personId) {
        setSelectedCoAssignees(prev => [...prev, person]);
      }
    }
    setShowCoAssigneeSelect(false);
  };
  
  // Remove co-assignee
  const handleRemoveCoAssignee = (personId: string) => {
    setSelectedCoAssignees(prev => prev.filter(p => p.id !== personId));
  };
  
  // Add tag
  const handleAddTag = (tagId: string) => {
    const tag = tagsForProject.find(t => t.id === tagId);
    if (tag && !selectedTags.find(t => t.id === tagId)) {
      setSelectedTags(prev => [...prev, tag]);
    }
    setShowTagSelect(false);
  };
  
  // Remove tag
  const handleRemoveTag = (tagId: string) => {
    setSelectedTags(prev => prev.filter(t => t.id !== tagId));
  };
  
  // Get available co-assignees (excluding primary assignee and already selected)
  const availableCoAssignees = useMemo(() => {
    return availablePeople.filter(p => 
      p.id !== formData.assignee_id && 
      !selectedCoAssignees.find(s => s.id === p.id)
    );
  }, [availablePeople, formData.assignee_id, selectedCoAssignees]);
  
  // Get available tags (excluding already selected)
  const availableTagsToAdd = useMemo(() => {
    return tagsForProject.filter(t => 
      !selectedTags.find(s => s.id === t.id)
    );
  }, [tagsForProject, selectedTags]);
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Project Info (if available) */}
      {project && (
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 pb-2">
          <div
            className="w-3 h-3 rounded"
            style={{ backgroundColor: project.color }}
          />
          <span>{project.name}</span>
        </div>
      )}
      
      {/* Task Title */}
      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Task Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={handleInputChange}
          placeholder="Enter task title"
          className={twMerge(
            clsx(
              'w-full px-3 py-2 rounded-md border shadow-sm',
              'bg-white dark:bg-gray-900',
              'text-gray-900 dark:text-gray-100',
              'placeholder-gray-400 dark:placeholder-gray-500',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
              errors.title
                ? 'border-red-500 dark:border-red-400'
                : 'border-gray-300 dark:border-gray-600'
            )
          )}
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
          placeholder="Enter task description (optional)"
          rows={3}
          className={twMerge(
            clsx(
              'w-full px-3 py-2 rounded-md border shadow-sm resize-none',
              'bg-white dark:bg-gray-900',
              'text-gray-900 dark:text-gray-100',
              'placeholder-gray-400 dark:placeholder-gray-500',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
              errors.description
                ? 'border-red-500 dark:border-red-400'
                : 'border-gray-300 dark:border-gray-600'
            )
          )}
          disabled={isLoading}
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-500 dark:text-red-400">{errors.description}</p>
        )}
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {formData.description.length}/2000 characters
        </p>
      </div>
      
      {/* Status and Priority Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          <div className="mt-2">
            <StatusBadge status={formData.status} size="sm" />
          </div>
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
          <div className="mt-2">
            <PriorityBadge priority={formData.priority} size="sm" />
          </div>
        </div>
      </div>
      
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
          value={formData.assignee_id}
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
      
      {/* Date Range */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                'bg-white dark:bg-gray-900',
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
                'bg-white dark:bg-gray-900',
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

// Users icon component for co-assignees label
function Users({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export default TaskForm;
