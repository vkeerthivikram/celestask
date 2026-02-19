import React, { useState, useRef, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  Plus,
  ChevronDown,
  ChevronUp,
  Calendar,
  Flag,
  FolderOpen,
  Loader2,
} from 'lucide-react';
import { useTasks } from '../../context/TaskContext';
import { useProjects } from '../../context/ProjectContext';
import { useToast } from '../../context/ToastContext';
import { useShortcuts } from '../../context/ShortcutContext';
import { TaskPriority, Project } from '../../types';

interface QuickAddTaskProps {
  className?: string;
}

const priorityConfig: Record<TaskPriority, { label: string; color: string }> = {
  urgent: { label: 'Urgent', color: 'text-red-500' },
  high: { label: 'High', color: 'text-orange-500' },
  medium: { label: 'Medium', color: 'text-blue-500' },
  low: { label: 'Low', color: 'text-gray-500' },
};

export function QuickAddTask({ className }: QuickAddTaskProps) {
  const [title, setTitle] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const projectDropdownRef = useRef<HTMLDivElement>(null);
  const priorityDropdownRef = useRef<HTMLDivElement>(null);
  
  const { createTask } = useTasks();
  const { projects, currentProject } = useProjects();
  const { showToast } = useToast();
  const { registerShortcut, unregisterShortcut } = useShortcuts();
  
  // Get the effective project ID (selected or current)
  const effectiveProjectId = selectedProjectId || currentProject?.id;
  const selectedProject = projects.find(p => p.id === effectiveProjectId);
  
  // Register keyboard shortcut 'n' to focus input
  useEffect(() => {
    const shortcutId = 'quick-add-task-focus';
    registerShortcut({
      id: shortcutId,
      key: 'n',
      description: 'Focus quick add task input',
      category: 'Tasks',
      action: () => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      },
    });
    
    return () => {
      unregisterShortcut(shortcutId);
    };
  }, [registerShortcut, unregisterShortcut]);
  
  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target as Node)) {
        setShowProjectDropdown(false);
      }
      if (priorityDropdownRef.current && !priorityDropdownRef.current.contains(event.target as Node)) {
        setShowPriorityDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!title.trim()) {
      showToast('Please enter a task title', 'warning');
      return;
    }
    
    if (!effectiveProjectId) {
      showToast('Please select a project first', 'warning');
      return;
    }
    
    setIsLoading(true);
    
    try {
      await createTask({
        title: title.trim(),
        project_id: effectiveProjectId,
        status: 'todo',
        priority,
        due_date: dueDate || undefined,
      });
      
      showToast('Task created successfully', 'success');
      setTitle('');
      setDueDate('');
      setPriority('medium');
      setIsExpanded(false);
    } catch (error) {
      showToast('Failed to create task', 'error');
      console.error('Failed to create task:', error);
    } finally {
      setIsLoading(false);
    }
  }, [title, effectiveProjectId, priority, dueDate, createTask, showToast]);
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      inputRef.current?.blur();
      setShowProjectDropdown(false);
      setShowPriorityDropdown(false);
    }
  };
  
  return (
    <div className={twMerge(clsx('relative', className))}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        {/* Main Input Row */}
        <div className="flex items-center gap-2">
          {/* Task Input */}
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Quick add task... (Press Enter)"
              disabled={isLoading}
              className={twMerge(
                clsx(
                  'w-full px-3 py-2 text-sm rounded-lg border',
                  'bg-gray-50 dark:bg-gray-700',
                  'border-gray-200 dark:border-gray-600',
                  'text-gray-900 dark:text-gray-100',
                  'placeholder-gray-400 dark:placeholder-gray-500',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'transition-colors duration-200'
                )
              )}
              aria-label="Quick add task"
            />
          </div>
          
          {/* Project Selector (Compact) */}
          <div className="relative" ref={projectDropdownRef}>
            <button
              type="button"
              onClick={() => setShowProjectDropdown(!showProjectDropdown)}
              disabled={isLoading}
              className={twMerge(
                clsx(
                  'flex items-center gap-1 px-2 py-2 text-sm rounded-lg border',
                  'bg-gray-50 dark:bg-gray-700',
                  'border-gray-200 dark:border-gray-600',
                  'text-gray-700 dark:text-gray-300',
                  'hover:bg-gray-100 dark:hover:bg-gray-600',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'transition-colors duration-200'
                )
              )}
              aria-label="Select project"
              aria-expanded={showProjectDropdown}
              aria-haspopup="listbox"
            >
              {selectedProject ? (
                <>
                  <div
                    className="w-2.5 h-2.5 rounded-sm"
                    style={{ backgroundColor: selectedProject.color }}
                    aria-hidden="true"
                  />
                  <span className="hidden sm:inline max-w-[100px] truncate">
                    {selectedProject.name}
                  </span>
                </>
              ) : (
                <FolderOpen className="w-4 h-4" />
              )}
              <ChevronDown className={twMerge(
                clsx('w-3 h-3 transition-transform', showProjectDropdown && 'rotate-180')
              )} />
            </button>
            
            {/* Project Dropdown */}
            {showProjectDropdown && (
              <div
                role="listbox"
                className={twMerge(
                  clsx(
                    'absolute top-full right-0 mt-1 z-50',
                    'min-w-[200px] max-h-[300px] overflow-y-auto',
                    'bg-white dark:bg-gray-800',
                    'border border-gray-200 dark:border-gray-700',
                    'rounded-lg shadow-lg',
                    'py-1'
                  )
                )}
              >
                {projects.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                    No projects available
                  </div>
                ) : (
                  projects.map((project) => (
                    <button
                      key={project.id}
                      type="button"
                      role="option"
                      aria-selected={effectiveProjectId === project.id}
                      onClick={() => {
                        setSelectedProjectId(project.id);
                        setShowProjectDropdown(false);
                      }}
                      className={twMerge(
                        clsx(
                          'w-full flex items-center gap-2 px-3 py-2 text-sm text-left',
                          'hover:bg-gray-100 dark:hover:bg-gray-700',
                          effectiveProjectId === project.id && 'bg-blue-50 dark:bg-blue-900/30'
                        )
                      )}
                    >
                      <div
                        className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: project.color }}
                        aria-hidden="true"
                      />
                      <span className="truncate">{project.name}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          
          {/* Expand/Collapse Button */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            disabled={isLoading}
            className={twMerge(
              clsx(
                'p-2 text-sm rounded-lg border',
                'bg-gray-50 dark:bg-gray-700',
                'border-gray-200 dark:border-gray-600',
                'text-gray-500 dark:text-gray-400',
                'hover:bg-gray-100 dark:hover:bg-gray-600',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'transition-colors duration-200'
              )
            )}
            aria-label={isExpanded ? 'Collapse options' : 'Expand options'}
            aria-expanded={isExpanded}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          
          {/* Add Button */}
          <button
            type="submit"
            disabled={isLoading || !title.trim()}
            className={twMerge(
              clsx(
                'flex items-center justify-center p-2 text-sm rounded-lg',
                'bg-blue-500 hover:bg-blue-600',
                'text-white',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'transition-colors duration-200'
              )
            )}
            aria-label="Add task"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
          </button>
        </div>
        
        {/* Expanded Options Row */}
        {isExpanded && (
          <div className="flex items-center gap-2 pl-1">
            {/* Priority Selector */}
            <div className="relative" ref={priorityDropdownRef}>
              <button
                type="button"
                onClick={() => setShowPriorityDropdown(!showPriorityDropdown)}
                disabled={isLoading}
                className={twMerge(
                  clsx(
                    'flex items-center gap-1.5 px-2 py-1.5 text-xs rounded-md',
                    'bg-gray-100 dark:bg-gray-700',
                    'text-gray-600 dark:text-gray-300',
                    'hover:bg-gray-200 dark:hover:bg-gray-600',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'transition-colors duration-200'
                  )
                )}
                aria-label="Select priority"
                aria-expanded={showPriorityDropdown}
                aria-haspopup="listbox"
              >
                <Flag className={twMerge('w-3.5 h-3.5', priorityConfig[priority].color)} />
                <span>{priorityConfig[priority].label}</span>
                <ChevronDown className={twMerge(
                  clsx('w-3 h-3 transition-transform', showPriorityDropdown && 'rotate-180')
                )} />
              </button>
              
              {/* Priority Dropdown */}
              {showPriorityDropdown && (
                <div
                  role="listbox"
                  className={twMerge(
                    clsx(
                      'absolute top-full left-0 mt-1 z-50',
                      'min-w-[120px]',
                      'bg-white dark:bg-gray-800',
                      'border border-gray-200 dark:border-gray-700',
                      'rounded-lg shadow-lg',
                      'py-1'
                    )
                  )}
                >
                  {(Object.keys(priorityConfig) as TaskPriority[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      role="option"
                      aria-selected={priority === p}
                      onClick={() => {
                        setPriority(p);
                        setShowPriorityDropdown(false);
                      }}
                      className={twMerge(
                        clsx(
                          'w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left',
                          'hover:bg-gray-100 dark:hover:bg-gray-700',
                          priority === p && 'bg-blue-50 dark:bg-blue-900/30'
                        )
                      )}
                    >
                      <Flag className={twMerge('w-3.5 h-3.5', priorityConfig[p].color)} />
                      <span>{priorityConfig[p].label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Due Date Picker */}
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={isLoading}
                className={twMerge(
                  clsx(
                    'px-2 py-1.5 text-xs rounded-md',
                    'bg-gray-100 dark:bg-gray-700',
                    'text-gray-600 dark:text-gray-300',
                    'border-0',
                    'focus:outline-none focus:ring-1 focus:ring-blue-500',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'transition-colors duration-200',
                    '[color-scheme:light] dark:[color-scheme:dark]'
                  )
                )}
                aria-label="Due date"
              />
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

export default QuickAddTask;
