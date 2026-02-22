'use client';

import React, { useEffect, useState } from 'react';
import { Play, Pause, Square, Clock, Plus, Edit2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useTimeEntries } from '@/context/TimeEntryContext';
import type { TimeEntry, CreateTimeEntryDTO, UpdateTimeEntryDTO } from '@/types';
import { formatDurationUs, formatDurationUsCompact, formatTimerDisplayUs, parseDurationStringToUs, TIME_UNITS } from '@/utils/timeFormat';

function formatDateTimeLocal(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

interface TimeTrackerProps {
  entityType: 'task' | 'project';
  entityId: number | string;
  entityName?: string;
  compact?: boolean;
  showSummary?: boolean;
  onEditEntry?: (entry: TimeEntry) => void;
}

export function TimeTracker({
  entityType,
  entityId,
  entityName,
  compact = false,
  showSummary = true,
  onEditEntry,
}: TimeTrackerProps) {
  const {
    timerTick,
    startTaskTimer,
    stopTaskTimer,
    startProjectTimer,
    stopProjectTimer,
    isTaskTimerRunning,
    isProjectTimerRunning,
    getRunningTimerForTask,
    getRunningTimerForProject,
    fetchTaskTimeSummary,
    fetchProjectTimeSummary,
  } = useTimeEntries();
  
  const [summary, setSummary] = useState<{ total_time_us: number; direct_time_us: number; children_time_us?: number } | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualDuration, setManualDuration] = useState('');
  const [manualDescription, setManualDescription] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  
  const isRunning = entityType === 'task' 
    ? isTaskTimerRunning(entityId) 
    : isProjectTimerRunning(entityId);
    
  const runningTimer = entityType === 'task' 
    ? getRunningTimerForTask(entityId) 
    : getRunningTimerForProject(entityId);
  
  useEffect(() => {
    if (showSummary) {
      const fetchSummary = async () => {
        try {
          if (entityType === 'task') {
            const data = await fetchTaskTimeSummary(entityId);
            setSummary({
              total_time_us: data.total_time_us,
              direct_time_us: data.direct_time_us,
              children_time_us: data.children_time_us,
            });
          } else {
            const data = await fetchProjectTimeSummary(entityId);
            setSummary({
              total_time_us: data.total_time_us,
              direct_time_us: data.direct_time_us,
              children_time_us: data.tasks_time_us + data.subprojects_time_us,
            });
          }
        } catch (err) {
          console.error('Failed to fetch time summary:', err);
        }
      };
      fetchSummary();
    }
  }, [entityType, entityId, showSummary, fetchTaskTimeSummary, fetchProjectTimeSummary, runningTimer]);
  
  const handleStart = async () => {
    setIsStarting(true);
    try {
      if (entityType === 'task') {
        await startTaskTimer(entityId);
      } else {
        await startProjectTimer(entityId);
      }
    } catch (err) {
      console.error('Failed to start timer:', err);
    } finally {
      setIsStarting(false);
    }
  };
  
  const handleStop = async () => {
    setIsStopping(true);
    try {
      if (entityType === 'task') {
        await stopTaskTimer(entityId);
      } else {
        await stopProjectTimer(entityId);
      }
      if (showSummary) {
        try {
          if (entityType === 'task') {
            const data = await fetchTaskTimeSummary(entityId);
            setSummary({
              total_time_us: data.total_time_us,
              direct_time_us: data.direct_time_us,
              children_time_us: data.children_time_us,
            });
          } else {
            const data = await fetchProjectTimeSummary(entityId);
            setSummary({
              total_time_us: data.total_time_us,
              direct_time_us: data.direct_time_us,
              children_time_us: data.tasks_time_us + data.subprojects_time_us,
            });
          }
        } catch (err) {
          console.error('Failed to refresh summary:', err);
        }
      }
    } catch (err) {
      console.error('Failed to stop timer:', err);
    } finally {
      setIsStopping(false);
    }
  };
  
  const handleAddManualTime = async () => {
    const durationUs = parseDurationStringToUs(manualDuration);
    if (durationUs === null || durationUs <= 0) {
      return;
    }
    
    const now = new Date();
    const startTime = new Date(now.getTime() - (durationUs / TIME_UNITS.MILLISECOND));
    
    const data: CreateTimeEntryDTO = {
      start_time: startTime.toISOString(),
      end_time: now.toISOString(),
      duration_us: durationUs,
      description: manualDescription || undefined,
    };
    
    try {
      const { addManualTaskTimeEntry, addManualProjectTimeEntry } = useTimeEntries();
      if (entityType === 'task') {
        await addManualTaskTimeEntry(entityId, data);
      } else {
        await addManualProjectTimeEntry(entityId, data);
      }
      setShowManualEntry(false);
      setManualDuration('');
      setManualDescription('');
      if (showSummary) {
        if (entityType === 'task') {
          const summaryData = await fetchTaskTimeSummary(entityId);
          setSummary({
            total_time_us: summaryData.total_time_us,
            direct_time_us: summaryData.direct_time_us,
            children_time_us: summaryData.children_time_us,
          });
        } else {
          const summaryData = await fetchProjectTimeSummary(entityId);
          setSummary({
            total_time_us: summaryData.total_time_us,
            direct_time_us: summaryData.direct_time_us,
            children_time_us: summaryData.tasks_time_us + summaryData.subprojects_time_us,
          });
        }
      }
    } catch (err) {
      console.error('Failed to add manual time:', err);
    }
  };
  
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {isRunning && runningTimer ? (
          <div className="flex items-center gap-1">
            <span className="text-xs font-mono text-green-600 dark:text-green-400 animate-pulse">
              {formatTimerDisplayUs(runningTimer.start_time)}
            </span>
            <button
              onClick={handleStop}
              disabled={isStopping}
              className={twMerge(clsx(
                'p-1 rounded transition-colors',
                'hover:bg-gray-200 dark:hover:bg-gray-700',
                'disabled:opacity-50'
              ))}
              title="Stop timer"
            >
              <Square className="w-3 h-3 text-red-500" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleStart}
            disabled={isStarting}
            className={twMerge(clsx(
              'p-1 rounded transition-colors',
              'hover:bg-gray-200 dark:hover:bg-gray-700',
              'disabled:opacity-50'
            ))}
            title="Start timer"
          >
            <Play className="w-3 h-3 text-gray-500 dark:text-gray-400" />
          </button>
        )}
        {summary && summary.total_time_us > 0 && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatDurationUsCompact(summary.total_time_us)}
          </span>
        )}
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Time Tracking
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {isRunning && runningTimer ? (
            <div className="flex items-center gap-2">
              <span className="text-lg font-mono text-green-600 dark:text-green-400 font-semibold">
                {formatTimerDisplayUs(runningTimer.start_time)}
              </span>
              <button
                onClick={handleStop}
                disabled={isStopping}
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
                onClick={handleStart}
                disabled={isStarting}
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
      
      {showManualEntry && (
        <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-md space-y-3">
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
              onClick={() => setShowManualEntry(false)}
              className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleAddManualTime}
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
      
      {showSummary && summary && (
        <div className="grid grid-cols-3 gap-2 p-2 bg-gray-50 dark:bg-gray-800/30 rounded">
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {formatDurationUs(summary.direct_time_us)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Direct</div>
          </div>
          {summary.children_time_us !== undefined && summary.children_time_us > 0 && (
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                {formatDurationUs(summary.children_time_us)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {entityType === 'task' ? 'Subtasks' : 'Children'}
              </div>
            </div>
          )}
          <div className="text-center">
            <div className="text-lg font-semibold text-primary-600 dark:text-primary-400">
              {formatDurationUs(summary.total_time_us)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Total</div>
          </div>
        </div>
      )}
    </div>
  );
}

interface TimerButtonProps {
  entityType: 'task' | 'project';
  entityId: number | string;
  className?: string;
}

export function TimerButton({ entityType, entityId, className }: TimerButtonProps) {
  const {
    timerTick,
    startTaskTimer,
    stopTaskTimer,
    startProjectTimer,
    stopProjectTimer,
    isTaskTimerRunning,
    isProjectTimerRunning,
    getRunningTimerForTask,
    getRunningTimerForProject,
  } = useTimeEntries();
  
  const [isLoading, setIsLoading] = useState(false);
  
  const isRunning = entityType === 'task' 
    ? isTaskTimerRunning(entityId) 
    : isProjectTimerRunning(entityId);
    
  const runningTimer = entityType === 'task' 
    ? getRunningTimerForTask(entityId) 
    : getRunningTimerForProject(entityId);
  
  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLoading(true);
    try {
      if (isRunning) {
        if (entityType === 'task') {
          await stopTaskTimer(entityId);
        } else {
          await stopProjectTimer(entityId);
        }
      } else {
        if (entityType === 'task') {
          await startTaskTimer(entityId);
        } else {
          await startProjectTimer(entityId);
        }
      }
    } catch (err) {
      console.error('Timer action failed:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={twMerge(clsx(
        'flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors',
        isRunning 
          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50' 
          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600',
        isLoading && 'opacity-50 cursor-wait',
        className
      ))}
      title={isRunning ? 'Stop timer' : 'Start timer'}
    >
      {isRunning ? (
        <>
          <Square className="w-3 h-3" />
          {runningTimer && formatTimerDisplayUs(runningTimer.start_time)}
        </>
      ) : (
        <>
          <Play className="w-3 h-3" />
          Start
        </>
      )}
    </button>
  );
}

interface TimeDisplayProps {
  entityType: 'task' | 'project';
  entityId: number | string;
  className?: string;
}

export function TimeDisplay({ entityType, entityId, className }: TimeDisplayProps) {
  const [totalUs, setTotalUs] = useState(0);
  const { fetchTaskTimeSummary, fetchProjectTimeSummary } = useTimeEntries();
  
  useEffect(() => {
    const fetchTime = async () => {
      try {
        if (entityType === 'task') {
          const summary = await fetchTaskTimeSummary(entityId);
          setTotalUs(summary.total_time_us);
        } else {
          const summary = await fetchProjectTimeSummary(entityId);
          setTotalUs(summary.total_time_us);
        }
      } catch (err) {
        console.error('Failed to fetch time:', err);
      }
    };
    fetchTime();
  }, [entityType, entityId, fetchTaskTimeSummary, fetchProjectTimeSummary]);
  
  if (totalUs === 0) {
    return null;
  }
  
  return (
    <span className={twMerge(clsx(
      'inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400',
      className
    ))}>
      <Clock className="w-3 h-3" />
      {formatDurationUsCompact(totalUs)}
    </span>
  );
}

export default TimeTracker;
