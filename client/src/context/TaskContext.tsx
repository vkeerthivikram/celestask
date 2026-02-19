import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react';
import type { Task, TaskFilters, CreateTaskDTO, UpdateTaskDTO, TaskStatus, TreeNode, TaskProgressRollup, UpdateTaskProgressDTO, BulkUpdateDTO, BulkUpdateResponse, TaskPriority } from '../types';
import * as api from '../services/api';
import { useToast } from './ToastContext';

interface TaskContextType {
  // State
  tasks: Task[];
  filteredTasks: Task[];
  loading: boolean;
  error: string | null;
  
  // Selection State
  selectedTaskIds: number[];
  isTaskSelected: (id: number) => boolean;
  isAllSelected: boolean;
  isPartialSelected: boolean;
  
  // Filters
  filters: TaskFilters;
  setFilters: (filters: TaskFilters) => void;
  updateFilter: <K extends keyof TaskFilters>(key: K, value: TaskFilters[K]) => void;
  clearFilters: () => void;
  
  // Actions
  fetchTasks: (filters?: TaskFilters) => Promise<void>;
  fetchTasksByProject: (projectId: number) => Promise<void>;
  createTask: (data: CreateTaskDTO) => Promise<Task>;
  updateTask: (id: number, data: UpdateTaskDTO) => Promise<Task>;
  updateTaskStatus: (id: number, status: TaskStatus) => Promise<Task>;
  deleteTask: (id: number) => Promise<void>;
  clearError: () => void;
  
  // Bulk Actions
  toggleTaskSelection: (id: number) => void;
  selectAllTasks: () => void;
  clearSelection: () => void;
  bulkUpdateTasks: (updates: { status?: TaskStatus; priority?: TaskPriority; assignee_id?: number | null }) => Promise<BulkUpdateResponse>;
  bulkDeleteTasks: () => Promise<void>;
  
  // Assignee Actions
  setPrimaryAssignee: (taskId: number, personId: number) => Promise<void>;
  addCoAssignee: (taskId: number, personId: number, role?: string) => Promise<void>;
  removeCoAssignee: (taskId: number, personId: number) => Promise<void>;
  
  // Tag Actions
  addTagToTask: (taskId: number, tagId: number) => Promise<void>;
  removeTagFromTask: (taskId: number, tagId: number) => Promise<void>;
  
  // Tree Actions
  fetchTaskTree: (id: number) => Promise<TreeNode<Task>>;
  getTaskChildren: (id: number) => Promise<Task[]>;
  createSubTask: (parentId: number, data: CreateTaskDTO) => Promise<Task>;
  moveTask: (id: number, parentId: number | null) => Promise<Task>;
  fetchRootTasks: (projectId: number) => Promise<Task[]>;
  
  // Progress Actions
  updateTaskProgress: (id: number, data: UpdateTaskProgressDTO) => Promise<Task>;
  getTaskProgressRollup: (id: number) => Promise<TaskProgressRollup>;
  
  // Helpers
  getTaskById: (id: number) => Task | undefined;
  getTasksByStatus: (status: TaskStatus) => Task[];
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

interface TaskProviderProps {
  children: ReactNode;
  projectId?: number | null;
}

const DEFAULT_FILTERS: TaskFilters = {};

export function TaskProvider({ children, projectId }: TaskProviderProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<TaskFilters>(DEFAULT_FILTERS);
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
  const toast = useToast();
  
  // Apply filters to tasks
  const filteredTasks = useMemo(() => {
    let result = [...tasks];
    
    if (filters.project_id !== undefined) {
      result = result.filter(t => t.project_id === filters.project_id);
    }
    
    if (filters.status) {
      result = result.filter(t => t.status === filters.status);
    }
    
    if (filters.priority) {
      result = result.filter(t => t.priority === filters.priority);
    }
    
    if (filters.due_date_from) {
      result = result.filter(t => 
        t.due_date && new Date(t.due_date) >= new Date(filters.due_date_from!)
      );
    }
    
    if (filters.due_date_to) {
      result = result.filter(t => 
        t.due_date && new Date(t.due_date) <= new Date(filters.due_date_to!)
      );
    }
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(t => 
        t.title.toLowerCase().includes(searchLower) ||
        t.description.toLowerCase().includes(searchLower)
      );
    }
    
    if (filters.assignee_id !== undefined) {
      result = result.filter(t => 
        t.assignee_id === filters.assignee_id ||
        t.coAssignees?.some(ca => ca.person_id === filters.assignee_id)
      );
    }
    
    if (filters.tag_id !== undefined) {
      result = result.filter(t => 
        t.tags?.some(tg => tg.tag_id === filters.tag_id)
      );
    }
    
    return result;
  }, [tasks, filters]);
  
  // Selection helpers
  const isTaskSelected = useCallback((id: number): boolean => {
    return selectedTaskIds.includes(id);
  }, [selectedTaskIds]);
  
  const isAllSelected = useMemo((): boolean => {
    return filteredTasks.length > 0 && filteredTasks.every(t => selectedTaskIds.includes(t.id));
  }, [filteredTasks, selectedTaskIds]);
  
  const isPartialSelected = useMemo((): boolean => {
    return selectedTaskIds.length > 0 && !isAllSelected;
  }, [selectedTaskIds.length, isAllSelected]);
  
  // Toggle task selection
  const toggleTaskSelection = useCallback((id: number): void => {
    setSelectedTaskIds(prev => 
      prev.includes(id) 
        ? prev.filter(taskId => taskId !== id)
        : [...prev, id]
    );
  }, []);
  
  // Select all filtered tasks
  const selectAllTasks = useCallback((): void => {
    setSelectedTaskIds(filteredTasks.map(t => t.id));
  }, [filteredTasks]);
  
  // Clear selection
  const clearSelection = useCallback((): void => {
    setSelectedTaskIds([]);
  }, []);

  
  // Fetch all tasks (optionally with filters)
  const fetchTasks = useCallback(async (fetchFilters?: TaskFilters) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await api.getTasks(fetchFilters);
      setTasks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Fetch tasks by project
  const fetchTasksByProject = useCallback(async (projId: number) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await api.getTasks({ project_id: projId });
      setTasks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Set filters
  const setFilters = useCallback((newFilters: TaskFilters) => {
    setFiltersState(newFilters);
  }, []);
  
  // Update a single filter
  const updateFilter = useCallback(<K extends keyof TaskFilters>(key: K, value: TaskFilters[K]) => {
    setFiltersState(prev => ({
      ...prev,
      [key]: value,
    }));
  }, []);
  
  // Clear all filters
  const clearFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
  }, []);
  
  // Create a new task
  const createTask = useCallback(async (data: CreateTaskDTO): Promise<Task> => {
    setLoading(true);
    setError(null);
    
    try {
      const newTask = await api.createTask(data);
      setTasks(prev => [...prev, newTask]);
      toast.success('Task created', `"${newTask.title}" has been created successfully.`);
      return newTask;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create task';
      setError(errorMessage);
      toast.error('Failed to create task', errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [toast]);
  
  // Update an existing task
  const updateTask = useCallback(async (id: number, data: UpdateTaskDTO): Promise<Task> => {
    setLoading(true);
    setError(null);
    
    try {
      const updatedTask = await api.updateTask(id, data);
      setTasks(prev => 
        prev.map(t => t.id === id ? updatedTask : t)
      );
      toast.success('Task updated', `"${updatedTask.title}" has been updated.`);
      return updatedTask;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update task';
      setError(errorMessage);
      toast.error('Failed to update task', errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [toast]);
  
  // Update task status (for Kanban drag-and-drop)
  const updateTaskStatus = useCallback(async (id: number, status: TaskStatus): Promise<Task> => {
    // Optimistic update
    setTasks(prev => 
      prev.map(t => t.id === id ? { ...t, status } : t)
    );
    
    try {
      const updatedTask = await api.updateTaskStatus(id, status);
      // Update with server response
      setTasks(prev => 
        prev.map(t => t.id === id ? updatedTask : t)
      );
      return updatedTask;
    } catch (err) {
      // Revert on error
      setTasks(prev => 
        prev.map(t => {
          if (t.id === id) {
            const originalTask = tasks.find(orig => orig.id === id);
            return originalTask || t;
          }
          return t;
        })
      );
      const errorMessage = err instanceof Error ? err.message : 'Failed to update task status';
      setError(errorMessage);
      toast.error('Failed to update status', errorMessage);
      throw new Error(errorMessage);
    }
  }, [tasks, toast]);
  
  // Bulk update tasks
  const bulkUpdateTasks = useCallback(async (updates: { status?: TaskStatus; priority?: TaskPriority; assignee_id?: number | null }): Promise<BulkUpdateResponse> => {
    if (selectedTaskIds.length === 0) {
      toast.warning('No tasks selected', 'Please select tasks to update.');
      return { updated: 0, tasks: [] };
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const bulkData: BulkUpdateDTO = {
        taskIds: selectedTaskIds,
        updates,
      };
      const result = await api.bulkUpdateTasks(bulkData);
      
      // Update local state with returned tasks
      setTasks(prev => 
        prev.map(t => {
          const updatedTask = result.tasks.find(ut => ut.id === t.id);
          return updatedTask || t;
        })
      );
      
      toast.success('Tasks updated', `${result.updated} task${result.updated !== 1 ? 's' : ''} updated successfully.`);
      clearSelection();
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update tasks';
      setError(errorMessage);
      toast.error('Bulk update failed', errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [selectedTaskIds, toast, clearSelection]);
  
  // Bulk delete tasks
  const bulkDeleteTasks = useCallback(async (): Promise<void> => {
    if (selectedTaskIds.length === 0) {
      toast.warning('No tasks selected', 'Please select tasks to delete.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.bulkDeleteTasks(selectedTaskIds);
      
      // Remove deleted tasks from local state
      setTasks(prev => prev.filter(t => !selectedTaskIds.includes(t.id)));
      
      toast.success('Tasks deleted', `${result.deleted} task${result.deleted !== 1 ? 's' : ''} deleted successfully.`);
      clearSelection();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete tasks';
      setError(errorMessage);
      toast.error('Bulk delete failed', errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [selectedTaskIds, toast, clearSelection]);
  
  // Set primary assignee
  const setPrimaryAssignee = useCallback(async (taskId: number, personId: number): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      const updatedTask = await api.setPrimaryAssignee(taskId, personId);
      setTasks(prev => 
        prev.map(t => t.id === taskId ? updatedTask : t)
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to set primary assignee';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Add co-assignee
  const addCoAssignee = useCallback(async (taskId: number, personId: number, role?: string): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      const newAssignee = await api.addTaskAssignee(taskId, { person_id: personId, role });
      setTasks(prev => 
        prev.map(t => {
          if (t.id === taskId) {
            const coAssignees = t.coAssignees || [];
            return { ...t, coAssignees: [...coAssignees, newAssignee] };
          }
          return t;
        })
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add co-assignee';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Remove co-assignee
  const removeCoAssignee = useCallback(async (taskId: number, personId: number): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      await api.removeTaskAssignee(taskId, personId);
      setTasks(prev => 
        prev.map(t => {
          if (t.id === taskId) {
            const coAssignees = t.coAssignees?.filter(ca => ca.person_id !== personId) || [];
            return { ...t, coAssignees };
          }
          return t;
        })
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove co-assignee';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Add tag to task
  const addTagToTask = useCallback(async (taskId: number, tagId: number): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      const newTaskTag = await api.addTaskTag(taskId, tagId);
      setTasks(prev => 
        prev.map(t => {
          if (t.id === taskId) {
            const tags = t.tags || [];
            return { ...t, tags: [...tags, newTaskTag] };
          }
          return t;
        })
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add tag to task';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Remove tag from task
  const removeTagFromTask = useCallback(async (taskId: number, tagId: number): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      await api.removeTaskTag(taskId, tagId);
      setTasks(prev => 
        prev.map(t => {
          if (t.id === taskId) {
            const tags = t.tags?.filter(tg => tg.tag_id !== tagId) || [];
            return { ...t, tags };
          }
          return t;
        })
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove tag from task';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Delete a task
  const deleteTask = useCallback(async (id: number): Promise<void> => {
    const taskToDelete = tasks.find(t => t.id === id);
    setLoading(true);
    setError(null);
    
    try {
      await api.deleteTask(id);
      setTasks(prev => prev.filter(t => t.id !== id));
      toast.success('Task deleted', taskToDelete ? `"${taskToDelete.title}" has been deleted.` : 'Task has been deleted.');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete task';
      setError(errorMessage);
      toast.error('Failed to delete task', errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [tasks, toast]);
  
  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  // Fetch task tree (task with all descendants)
  const fetchTaskTree = useCallback(async (id: number): Promise<TreeNode<Task>> => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await api.getTaskTree(id);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch task tree';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Get direct children of a task
  const getTaskChildren = useCallback(async (id: number): Promise<Task[]> => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await api.getTaskChildren(id);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch task children';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Create a subtask under a parent task
  const createSubTask = useCallback(async (parentId: number, data: CreateTaskDTO): Promise<Task> => {
    setLoading(true);
    setError(null);
    
    try {
      const newTask = await api.createSubTask(parentId, data);
      setTasks(prev => [...prev, newTask]);
      toast.success('Subtask created', `"${newTask.title}" has been created as a subtask.`);
      return newTask;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create subtask';
      setError(errorMessage);
      toast.error('Failed to create subtask', errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [toast]);
  
  // Move a task to a new parent
  const moveTask = useCallback(async (id: number, parentId: number | null): Promise<Task> => {
    setLoading(true);
    setError(null);
    
    try {
      const updatedTask = await api.moveTask(id, parentId);
      setTasks(prev => 
        prev.map(t => t.id === id ? updatedTask : t)
      );
      toast.success('Task moved', parentId ? 'Task moved to new parent.' : 'Task moved to root level.');
      return updatedTask;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to move task';
      setError(errorMessage);
      toast.error('Failed to move task', errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [toast]);
  
  // Fetch root tasks for a project (tasks without parents)
  const fetchRootTasks = useCallback(async (projectId: number): Promise<Task[]> => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await api.getRootTasks(projectId);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch root tasks';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Update task progress
  const updateTaskProgress = useCallback(async (id: number, data: UpdateTaskProgressDTO): Promise<Task> => {
    setLoading(true);
    setError(null);
    
    try {
      const updatedTask = await api.updateTaskProgress(id, data);
      setTasks(prev => 
        prev.map(t => t.id === id ? updatedTask : t)
      );
      toast.success('Progress updated', `Progress set to ${data.progress_percent ?? updatedTask.progress_percent}%.`);
      return updatedTask;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update task progress';
      setError(errorMessage);
      toast.error('Failed to update progress', errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [toast]);
  
  // Get task progress rollup (including children progress)
  const getTaskProgressRollup = useCallback(async (id: number): Promise<TaskProgressRollup> => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await api.getTaskProgressRollup(id);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch task progress rollup';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Get task by ID
  const getTaskById = useCallback((id: number): Task | undefined => {
    return tasks.find(t => t.id === id);
  }, [tasks]);
  
  // Get tasks by status
  const getTasksByStatus = useCallback((status: TaskStatus): Task[] => {
    return filteredTasks.filter(t => t.status === status);
  }, [filteredTasks]);
  
  // Fetch tasks when projectId changes
  useEffect(() => {
    if (projectId !== undefined && projectId !== null) {
      fetchTasksByProject(projectId);
      setFiltersState(prev => ({ ...prev, project_id: projectId }));
    } else {
      fetchTasks();
    }
  }, [projectId, fetchTasks, fetchTasksByProject]);
  
  const value: TaskContextType = {
    tasks,
    filteredTasks,
    loading,
    error,
    selectedTaskIds,
    isTaskSelected,
    isAllSelected,
    isPartialSelected,
    filters,
    setFilters,
    updateFilter,
    clearFilters,
    fetchTasks,
    fetchTasksByProject,
    createTask,
    updateTask,
    updateTaskStatus,
    deleteTask,
    clearError,
    toggleTaskSelection,
    selectAllTasks,
    clearSelection,
    bulkUpdateTasks,
    bulkDeleteTasks,
    setPrimaryAssignee,
    addCoAssignee,
    removeCoAssignee,
    addTagToTask,
    removeTagFromTask,
    fetchTaskTree,
    getTaskChildren,
    createSubTask,
    moveTask,
    fetchRootTasks,
    updateTaskProgress,
    getTaskProgressRollup,
    getTaskById,
    getTasksByStatus,
  };
  
  return (
    <TaskContext.Provider value={value}>
      {children}
    </TaskContext.Provider>
  );
}

export function useTasks(): TaskContextType {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
}

export default TaskContext;
