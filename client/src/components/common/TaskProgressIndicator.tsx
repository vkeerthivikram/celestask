'use client';

import React, { useState, useCallback } from 'react';
import type { Task, TaskProgressRollup } from '../../types';
import { ProgressBar } from './ProgressBar';
import { updateTaskProgress, getTaskProgressRollup } from '../../services/api';

interface TaskProgressIndicatorProps {
  task: Task;
  onUpdate?: (task: Task) => void;
  showRollup?: boolean;
  compact?: boolean;
}

export function TaskProgressIndicator({
  task,
  onUpdate,
  showRollup = true,
  compact = false,
}: TaskProgressIndicatorProps) {
  const [progress, setProgress] = useState(task.progress_percent ?? 0);
  const [estimatedHours, setEstimatedHours] = useState(
    Math.floor((task.estimated_duration_minutes ?? 0) / 60)
  );
  const [estimatedMinutes, setEstimatedMinutes] = useState(
    (task.estimated_duration_minutes ?? 0) % 60
  );
  const [actualHours, setActualHours] = useState(
    Math.floor((task.actual_duration_minutes ?? 0) / 60)
  );
  const [actualMinutes, setActualMinutes] = useState(
    (task.actual_duration_minutes ?? 0) % 60
  );
  const [rollup, setRollup] = useState<TaskProgressRollup | null>(null);
  const [showRollupDetails, setShowRollupDetails] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadRollup = useCallback(async () => {
    if (!showRollup) return;
    try {
      const data = await getTaskProgressRollup(task.id);
      setRollup(data);
    } catch (error) {
      console.error('Failed to load progress rollup:', error);
    }
  }, [task.id, showRollup]);

  const handleProgressChange = useCallback(
    async (newProgress: number) => {
      setProgress(newProgress);
      setSaving(true);
      try {
        const updatedTask = await updateTaskProgress(task.id, {
          progress_percent: newProgress,
        });
        onUpdate?.(updatedTask);
      } catch (error) {
        console.error('Failed to update progress:', error);
      } finally {
        setSaving(false);
      }
    },
    [task.id, onUpdate]
  );

  const handleDurationChange = useCallback(async () => {
    const estimatedTotal = estimatedHours * 60 + estimatedMinutes;
    const actualTotal = actualHours * 60 + actualMinutes;

    setSaving(true);
    try {
      const updatedTask = await updateTaskProgress(task.id, {
        progress_percent: progress,
        estimated_duration_minutes: estimatedTotal,
        actual_duration_minutes: actualTotal,
      });
      onUpdate?.(updatedTask);
    } catch (error) {
      console.error('Failed to update duration:', error);
    } finally {
      setSaving(false);
    }
  }, [task.id, progress, estimatedHours, estimatedMinutes, actualHours, actualMinutes, onUpdate]);

  React.useEffect(() => {
    loadRollup();
  }, [loadRollup]);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <ProgressBar percent={progress} size="sm" showLabel className="flex-1" />
        {saving && (
          <span className="text-xs text-gray-400">Saving...</span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Progress
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="0"
            max="100"
            value={progress}
            onChange={(e) => setProgress(Number(e.target.value))}
            onMouseUp={(e) => handleProgressChange(Number((e.target as HTMLInputElement).value))}
            onBlur={(e) => handleProgressChange(Number(e.target.value))}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <span className="text-sm font-medium text-gray-600 w-12 text-right">
            {progress}%
          </span>
        </div>
        <ProgressBar percent={progress} size="md" />
      </div>

      {/* Duration Fields */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Estimated Duration
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              value={estimatedHours}
              onChange={(e) => setEstimatedHours(Number(e.target.value))}
              onBlur={handleDurationChange}
              className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
              placeholder="Hours"
            />
            <span className="text-sm text-gray-500">h</span>
            <input
              type="number"
              min="0"
              max="59"
              value={estimatedMinutes}
              onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
              onBlur={handleDurationChange}
              className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
              placeholder="Min"
            />
            <span className="text-sm text-gray-500">m</span>
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Actual Duration
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              value={actualHours}
              onChange={(e) => setActualHours(Number(e.target.value))}
              onBlur={handleDurationChange}
              className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
              placeholder="Hours"
            />
            <span className="text-sm text-gray-500">h</span>
            <input
              type="number"
              min="0"
              max="59"
              value={actualMinutes}
              onChange={(e) => setActualMinutes(Number(e.target.value))}
              onBlur={handleDurationChange}
              className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
              placeholder="Min"
            />
            <span className="text-sm text-gray-500">m</span>
          </div>
        </div>
      </div>

      {/* Rollup Display */}
      {showRollup && rollup && rollup.children_count > 0 && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <button
            type="button"
            onClick={() => setShowRollupDetails(!showRollupDetails)}
            className="flex items-center justify-between w-full text-sm font-medium text-gray-700"
          >
            <span>Child Tasks Progress ({rollup.children_count} tasks)</span>
            <div className="flex items-center gap-2">
              <span className="text-blue-600">{rollup.progress_percent}%</span>
              <svg
                className={`w-4 h-4 transition-transform ${showRollupDetails ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>
          {showRollupDetails && rollup.children_progress.length > 0 && (
            <div className="mt-2 space-y-1">
              {rollup.children_progress.map((child) => (
                <div
                  key={child.task_id}
                  className="flex items-center justify-between text-xs text-gray-600"
                >
                  <span className="truncate">Task #{child.task_id}</span>
                  <span>{child.progress_percent}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {saving && (
        <div className="text-xs text-gray-400 text-center">Saving...</div>
      )}
    </div>
  );
}

export default TaskProgressIndicator;
