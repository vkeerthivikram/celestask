'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type {
  TimeEntry,
  TaskTimeSummary,
  ProjectTimeSummary,
  CreateTimeEntryDTO,
  StartTimerDTO,
  UpdateTimeEntryDTO,
} from '../types';
import * as api from '../services/api';
import { useToast } from './ToastContext';
import { formatDurationUsCompact } from '@/utils/timeFormat';

// Time entry context types
interface TimeEntryContextType {
  // Running timers state (global)
  runningTimers: TimeEntry[];
  runningTimersLoading: boolean;
  
  // Task time state
  taskTimeSummaries: Map<string, TaskTimeSummary>;
  taskTimeLoading: boolean;
  
  // Project time state
  projectTimeSummaries: Map<string, ProjectTimeSummary>;
  projectTimeLoading: boolean;
  
  // Error state
  error: string | null;
  
  // Timer tick for updating current session time
  timerTick: number;
  
  // Actions - Running timers
  fetchRunningTimers: () => Promise<void>;
  stopAllRunningTimers: () => Promise<void>;
  
  // Actions - Task time
  fetchTaskTimeSummary: (taskId: number | string) => Promise<TaskTimeSummary>;
  startTaskTimer: (taskId: number | string, data?: StartTimerDTO) => Promise<TimeEntry>;
  stopTaskTimer: (taskId: number | string) => Promise<TimeEntry>;
  addManualTaskTimeEntry: (taskId: number | string, data: CreateTimeEntryDTO) => Promise<TimeEntry>;
  
  // Actions - Project time
  fetchProjectTimeSummary: (projectId: number | string) => Promise<ProjectTimeSummary>;
  startProjectTimer: (projectId: number | string, data?: StartTimerDTO) => Promise<TimeEntry>;
  stopProjectTimer: (projectId: number | string) => Promise<TimeEntry>;
  addManualProjectTimeEntry: (projectId: number | string, data: CreateTimeEntryDTO) => Promise<TimeEntry>;
  
  // Actions - Time entry management
  updateTimeEntry: (entryId: string, data: UpdateTimeEntryDTO) => Promise<TimeEntry>;
  deleteTimeEntry: (entryId: string) => Promise<void>;
  
  // Helpers
  isTaskTimerRunning: (taskId: number | string) => boolean;
  isProjectTimerRunning: (projectId: number | string) => boolean;
  getRunningTimerForTask: (taskId: number | string) => TimeEntry | undefined;
  getRunningTimerForProject: (projectId: number | string) => TimeEntry | undefined;
  clearError: () => void;
}

const TimeEntryContext = createContext<TimeEntryContextType | undefined>(undefined);

export function TimeEntryProvider({ children }: { children: React.ReactNode }) {
  const toast = useToast();
  
  // State
  const [runningTimers, setRunningTimers] = useState<TimeEntry[]>([]);
  const [runningTimersLoading, setRunningTimersLoading] = useState(false);
  const [taskTimeSummaries, setTaskTimeSummaries] = useState<Map<string, TaskTimeSummary>>(new Map());
  const [taskTimeLoading, setTaskTimeLoading] = useState(false);
  const [projectTimeSummaries, setProjectTimeSummaries] = useState<Map<string, ProjectTimeSummary>>(new Map());
  const [projectTimeLoading, setProjectTimeLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timerTick, setTimerTick] = useState(0);
  
  // Interval ref for timer updates
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Fetch running timers on mount and set up interval for timer updates
  useEffect(() => {
    fetchRunningTimers();
    
    // Set up interval to update timer tick every second
    intervalRef.current = setInterval(() => {
      setTimerTick(prev => prev + 1);
    }, 1000);
    
    // Refresh running timers every 30 seconds
    const refreshInterval = setInterval(() => {
      fetchRunningTimers();
    }, 30000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      clearInterval(refreshInterval);
    };
  }, []);
  
  // Fetch running timers
  const fetchRunningTimers = useCallback(async () => {
    setRunningTimersLoading(true);
    try {
      const timers = await api.getRunningTimers();
      setRunningTimers(timers);
    } catch (err) {
      console.error('Error fetching running timers:', err);
    } finally {
      setRunningTimersLoading(false);
    }
  }, []);
  
  // Stop all running timers
  const stopAllRunningTimers = useCallback(async () => {
    try {
      const result = await api.stopAllTimers();
      if (result.stopped_count > 0) {
        toast.success('Timers stopped', `Stopped ${result.stopped_count} running timer(s)`);
      }
      setRunningTimers([]);
      // Refresh any cached summaries
      setTaskTimeSummaries(new Map());
      setProjectTimeSummaries(new Map());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to stop timers';
      setError(errorMessage);
      toast.error('Failed to stop timers', errorMessage);
      throw err;
    }
  }, [toast]);
  
  // Task time functions
  const fetchTaskTimeSummary = useCallback(async (taskId: number | string): Promise<TaskTimeSummary> => {
    const taskIdStr = String(taskId);
    
    // Check cache first
    const cached = taskTimeSummaries.get(taskIdStr);
    if (cached) {
      return cached;
    }
    
    setTaskTimeLoading(true);
    try {
      const summary = await api.getTaskTimeSummary(taskId);
      setTaskTimeSummaries(prev => new Map(prev).set(taskIdStr, summary));
      return summary;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch task time summary';
      setError(errorMessage);
      throw err;
    } finally {
      setTaskTimeLoading(false);
    }
  }, [taskTimeSummaries]);
  
  const startTaskTimer = useCallback(async (taskId: number | string, data?: StartTimerDTO): Promise<TimeEntry> => {
    setError(null);
    try {
      const entry = await api.startTaskTimer(taskId, data);
      
      // Update running timers
      setRunningTimers(prev => [...prev, entry]);
      
      // Clear cached summary for this task
      setTaskTimeSummaries(prev => {
        const newMap = new Map(prev);
        newMap.delete(String(taskId));
        return newMap;
      });
      
      toast.success('Timer started', `Timer started for task`);
      return entry;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start timer';
      setError(errorMessage);
      toast.error('Failed to start timer', errorMessage);
      throw err;
    }
  }, [toast]);
  
  const stopTaskTimer = useCallback(async (taskId: number | string): Promise<TimeEntry> => {
    setError(null);
    try {
      const entry = await api.stopTaskTimer(taskId);
      
      // Update running timers
      setRunningTimers(prev => prev.filter(t => t.id !== entry.id));
      
      // Clear cached summary for this task
      setTaskTimeSummaries(prev => {
        const newMap = new Map(prev);
        newMap.delete(String(taskId));
        return newMap;
      });
      
      const trackedTime = entry.duration_us ? formatDurationUsCompact(entry.duration_us) : '0s';
      toast.success('Timer stopped', `Tracked ${trackedTime}`);
      return entry;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to stop timer';
      setError(errorMessage);
      toast.error('Failed to stop timer', errorMessage);
      throw err;
    }
  }, [toast]);
  
  const addManualTaskTimeEntry = useCallback(async (taskId: number | string, data: CreateTimeEntryDTO): Promise<TimeEntry> => {
    setError(null);
    try {
      const entry = await api.createTaskTimeEntry(taskId, data);
      
      // Clear cached summary for this task
      setTaskTimeSummaries(prev => {
        const newMap = new Map(prev);
        newMap.delete(String(taskId));
        return newMap;
      });
      
      const addedTime = data.duration_us ? formatDurationUsCompact(data.duration_us) : '0s';
      toast.success('Time entry added', `Added ${addedTime}`);
      return entry;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add time entry';
      setError(errorMessage);
      toast.error('Failed to add time entry', errorMessage);
      throw err;
    }
  }, [toast]);
  
  // Project time functions
  const fetchProjectTimeSummary = useCallback(async (projectId: number | string): Promise<ProjectTimeSummary> => {
    const projectIdStr = String(projectId);
    
    // Check cache first
    const cached = projectTimeSummaries.get(projectIdStr);
    if (cached) {
      return cached;
    }
    
    setProjectTimeLoading(true);
    try {
      const summary = await api.getProjectTimeSummary(projectId);
      setProjectTimeSummaries(prev => new Map(prev).set(projectIdStr, summary));
      return summary;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch project time summary';
      setError(errorMessage);
      throw err;
    } finally {
      setProjectTimeLoading(false);
    }
  }, [projectTimeSummaries]);
  
  const startProjectTimer = useCallback(async (projectId: number | string, data?: StartTimerDTO): Promise<TimeEntry> => {
    setError(null);
    try {
      const entry = await api.startProjectTimer(projectId, data);
      
      // Update running timers
      setRunningTimers(prev => [...prev, entry]);
      
      // Clear cached summary for this project
      setProjectTimeSummaries(prev => {
        const newMap = new Map(prev);
        newMap.delete(String(projectId));
        return newMap;
      });
      
      toast.success('Timer started', `Timer started for project`);
      return entry;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start timer';
      setError(errorMessage);
      toast.error('Failed to start timer', errorMessage);
      throw err;
    }
  }, [toast]);
  
  const stopProjectTimer = useCallback(async (projectId: number | string): Promise<TimeEntry> => {
    setError(null);
    try {
      const entry = await api.stopProjectTimer(projectId);
      
      // Update running timers
      setRunningTimers(prev => prev.filter(t => t.id !== entry.id));
      
      // Clear cached summary for this project
      setProjectTimeSummaries(prev => {
        const newMap = new Map(prev);
        newMap.delete(String(projectId));
        return newMap;
      });
      
      const trackedTime = entry.duration_us ? formatDurationUsCompact(entry.duration_us) : '0s';
      toast.success('Timer stopped', `Tracked ${trackedTime}`);
      return entry;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to stop timer';
      setError(errorMessage);
      toast.error('Failed to stop timer', errorMessage);
      throw err;
    }
  }, [toast]);
  
  const addManualProjectTimeEntry = useCallback(async (projectId: number | string, data: CreateTimeEntryDTO): Promise<TimeEntry> => {
    setError(null);
    try {
      const entry = await api.createProjectTimeEntry(projectId, data);
      
      // Clear cached summary for this project
      setProjectTimeSummaries(prev => {
        const newMap = new Map(prev);
        newMap.delete(String(projectId));
        return newMap;
      });
      
      const addedTime = data.duration_us ? formatDurationUsCompact(data.duration_us) : '0s';
      toast.success('Time entry added', `Added ${addedTime}`);
      return entry;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add time entry';
      setError(errorMessage);
      toast.error('Failed to add time entry', errorMessage);
      throw err;
    }
  }, [toast]);
  
  // Time entry management
  const updateTimeEntry = useCallback(async (entryId: string, data: UpdateTimeEntryDTO): Promise<TimeEntry> => {
    setError(null);
    try {
      const entry = await api.updateTimeEntry(entryId, data);
      
      // Clear all cached summaries since we don't know which entity this belongs to
      setTaskTimeSummaries(new Map());
      setProjectTimeSummaries(new Map());
      
      toast.success('Time entry updated', 'Time entry has been updated');
      return entry;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update time entry';
      setError(errorMessage);
      toast.error('Failed to update time entry', errorMessage);
      throw err;
    }
  }, [toast]);
  
  const deleteTimeEntry = useCallback(async (entryId: string): Promise<void> => {
    setError(null);
    try {
      await api.deleteTimeEntry(entryId);
      
      // Clear all cached summaries since we don't know which entity this belongs to
      setTaskTimeSummaries(new Map());
      setProjectTimeSummaries(new Map());
      
      toast.success('Time entry deleted', 'Time entry has been deleted');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete time entry';
      setError(errorMessage);
      toast.error('Failed to delete time entry', errorMessage);
      throw err;
    }
  }, [toast]);
  
  // Helper functions
  const isTaskTimerRunning = useCallback((taskId: number | string): boolean => {
    return runningTimers.some(t => t.entity_type === 'task' && t.entity_id === String(taskId));
  }, [runningTimers]);
  
  const isProjectTimerRunning = useCallback((projectId: number | string): boolean => {
    return runningTimers.some(t => t.entity_type === 'project' && t.entity_id === String(projectId));
  }, [runningTimers]);
  
  const getRunningTimerForTask = useCallback((taskId: number | string): TimeEntry | undefined => {
    return runningTimers.find(t => t.entity_type === 'task' && t.entity_id === String(taskId));
  }, [runningTimers]);
  
  const getRunningTimerForProject = useCallback((projectId: number | string): TimeEntry | undefined => {
    return runningTimers.find(t => t.entity_type === 'project' && t.entity_id === String(projectId));
  }, [runningTimers]);
  
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  const value: TimeEntryContextType = {
    runningTimers,
    runningTimersLoading,
    taskTimeSummaries,
    taskTimeLoading,
    projectTimeSummaries,
    projectTimeLoading,
    error,
    timerTick,
    fetchRunningTimers,
    stopAllRunningTimers,
    fetchTaskTimeSummary,
    startTaskTimer,
    stopTaskTimer,
    addManualTaskTimeEntry,
    fetchProjectTimeSummary,
    startProjectTimer,
    stopProjectTimer,
    addManualProjectTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,
    isTaskTimerRunning,
    isProjectTimerRunning,
    getRunningTimerForTask,
    getRunningTimerForProject,
    clearError,
  };
  
  return (
    <TimeEntryContext.Provider value={value}>
      {children}
    </TimeEntryContext.Provider>
  );
}

export function useTimeEntries(): TimeEntryContextType {
  const context = useContext(TimeEntryContext);
  if (context === undefined) {
    throw new Error('useTimeEntries must be used within a TimeEntryProvider');
  }
  return context;
}
