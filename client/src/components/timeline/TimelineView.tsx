'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addMonths, eachDayOfInterval, differenceInDays, differenceInMilliseconds } from 'date-fns';
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTasks } from '../../context/TaskContext';
import { useProjects } from '../../context/ProjectContext';
import { useApp } from '../../context/AppContext';
import type { Task, TaskStatus, CreateTaskDTO, UpdateTaskDTO } from '../../types';
import { STATUS_CONFIG } from '../../types';
import { Modal } from '../common/Modal';
import { TaskForm } from '../common/TaskForm';
import TimelineTask from './TimelineTask';

type ZoomLevel = 'day' | 'week' | 'month';

// Get tasks with date range for timeline
interface TimelineData {
  task: Task;
  startDate: Date;
  endDate: Date;
  left: number;
  width: number;
  row: number;
}

export function TimelineView() {
  const { tasks, createTask, updateTask, deleteTask } = useTasks();
  const { currentProject } = useProjects();
  const { openSubTaskModal } = useApp();
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate date range based on zoom level
  const dateRange = useMemo(() => {
    const today = new Date();
    let start: Date;
    let end: Date;
    let daysToShow: number;

    switch (zoomLevel) {
      case 'day':
        start = startOfWeek(currentDate);
        end = endOfWeek(currentDate);
        daysToShow = 7;
        break;
      case 'week':
        start = startOfMonth(currentDate);
        end = endOfMonth(currentDate);
        daysToShow = differenceInDays(end, start) + 1;
        break;
      case 'month':
        start = startOfMonth(addMonths(currentDate, -1));
        end = endOfMonth(addMonths(currentDate, 1));
        daysToShow = differenceInDays(end, start) + 1;
        break;
      default:
        start = startOfWeek(currentDate);
        end = endOfWeek(currentDate);
        daysToShow = 7;
    }

    const days = eachDayOfInterval({ start, end });

    return { start, end, days, daysToShow };
  }, [zoomLevel, currentDate]);

  // Filter and calculate positions for tasks
  const timelineTasks = useMemo(() => {
    const tasksWithDates = tasks.filter(
      (task) => task.start_date && task.due_date
    );

    const { start, end, daysToShow } = dateRange;
    const totalDuration = differenceInMilliseconds(end, start) || 1;

    // Calculate rows (simple stacking algorithm)
    const rows: Array<{ end: Date }> = [];
    const data: TimelineData[] = [];

    tasksWithDates.forEach((task) => {
      const taskStart = new Date(task.start_date!);
      const taskEnd = new Date(task.due_date!);

      // Skip tasks outside the visible range
      if (taskEnd < start || taskStart > end) return;

      // Calculate position
      const visibleStart = Math.max(taskStart.getTime(), start.getTime());
      const visibleEnd = Math.min(taskEnd.getTime(), end.getTime());

      const left = (differenceInMilliseconds(new Date(visibleStart), start) / totalDuration) * 100;
      const width = (differenceInMilliseconds(new Date(visibleEnd), new Date(visibleStart)) / totalDuration) * 100;

      // Find row (simple stacking)
      let row = 0;
      for (let i = 0; i < rows.length; i++) {
        if (new Date(visibleStart) >= rows[i].end) {
          row = i;
          rows[i].end = new Date(visibleEnd);
          break;
        }
        row = i + 1;
      }
      if (row >= rows.length) {
        rows.push({ end: new Date(visibleEnd) });
      }

      data.push({
        task,
        startDate: taskStart,
        endDate: taskEnd,
        left: Math.max(0, left),
        width: Math.max(1, width),
        row,
      });
    });

    return {
      tasks: data,
      rowsNeeded: rows.length,
    };
  }, [tasks, dateRange]);

  // Navigate timeline
  const handleNavigate = useCallback(
    (direction: 'prev' | 'next') => {
      setCurrentDate((prev) => {
        switch (zoomLevel) {
          case 'day':
            return addDays(prev, direction === 'prev' ? -7 : 7);
          case 'week':
            return addMonths(prev, direction === 'prev' ? -1 : 1);
          case 'month':
            return addMonths(prev, direction === 'prev' ? -2 : 2);
          default:
            return prev;
        }
      });
    },
    [zoomLevel]
  );

  // Handle task click
  const handleTaskClick = useCallback((task: Task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  }, []);

  const handleCreateSubTask = useCallback((parentTaskId: number) => {
    openSubTaskModal(parentTaskId);
  }, [openSubTaskModal]);

  const handleDeleteTask = useCallback(async (task: Task) => {
    const shouldDelete = window.confirm(`Delete task "${task.title}"? This cannot be undone.`);
    if (!shouldDelete) {
      return;
    }

    try {
      await deleteTask(task.id);
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  }, [deleteTask]);

  // Handle modal close
  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedTask(null);
  }, []);

  // Handle form submit
  const handleSubmit = useCallback(
    async (data: CreateTaskDTO | UpdateTaskDTO) => {
      setIsSubmitting(true);
      try {
        if (selectedTask) {
          await updateTask(selectedTask.id, data as UpdateTaskDTO);
        } else {
          await createTask(data as CreateTaskDTO);
        }
        handleCloseModal();
      } catch (error) {
        console.error('Failed to save task:', error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [selectedTask, createTask, updateTask, handleCloseModal]
  );

  // Check if day is today
  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // Check if day is weekend
  const isWeekend = (date: Date): boolean => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  // Get column width based on zoom level
  const getColumnWidth = (): number => {
    switch (zoomLevel) {
      case 'day':
        return 100;
      case 'week':
        return 40;
      case 'month':
        return 20;
      default:
        return 40;
    }
  };

  // Get today marker position
  const getTodayPosition = (): number | null => {
    const today = new Date();
    const { start, end } = dateRange;
    
    if (today < start || today > end) return null;
    
    const totalDuration = differenceInMilliseconds(end, start) || 1;
    return (differenceInMilliseconds(today, start) / totalDuration) * 100;
  };

  const todayPosition = getTodayPosition();
  const columnWidth = getColumnWidth();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          {/* Navigation buttons */}
          <button
            onClick={() => handleNavigate('prev')}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
            aria-label="Previous"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => handleNavigate('next')}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
            aria-label="Next"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1.5 text-sm font-medium rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
          >
            Today
          </button>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 ml-2">
            {format(dateRange.start, zoomLevel === 'month' ? 'MMMM yyyy' : 'MMMM yyyy')}
          </h2>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoomLevel('day')}
            className={twMerge(
              clsx(
                'px-3 py-1.5 text-sm font-medium rounded-md border',
                zoomLevel === 'day'
                  ? 'bg-primary-500 text-white border-primary-500'
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
              )
            )}
          >
            Day
          </button>
          <button
            onClick={() => setZoomLevel('week')}
            className={twMerge(
              clsx(
                'px-3 py-1.5 text-sm font-medium rounded-md border',
                zoomLevel === 'week'
                  ? 'bg-primary-500 text-white border-primary-500'
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
              )
            )}
          >
            Week
          </button>
          <button
            onClick={() => setZoomLevel('month')}
            className={twMerge(
              clsx(
                'px-3 py-1.5 text-sm font-medium rounded-md border',
                zoomLevel === 'month'
                  ? 'bg-primary-500 text-white border-primary-500'
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
              )
            )}
          >
            Month
          </button>
        </div>
      </div>

      {/* Timeline container */}
      <div className="flex-1 overflow-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex min-w-full">
          {/* Task names column */}
          <div className="flex-shrink-0 w-48 md:w-64 border-r border-gray-200 dark:border-gray-700">
            {/* Header spacer */}
            <div className="h-14 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-3 py-2 flex items-center">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Tasks ({timelineTasks.tasks.length})
              </span>
            </div>
            {/* Task rows */}
            <div className="relative" style={{ height: timelineTasks.rowsNeeded * 40 + 20 }}>
              {timelineTasks.tasks.map((item, index) => (
                <div
                  key={item.task.id}
                  className={twMerge(
                    clsx(
                      'absolute right-0 h-8 flex items-center justify-end px-3',
                      'overflow-hidden'
                    )
                  )}
                  style={{ top: item.row * 40 + 10, width: '100%' }}
                >
                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                    {item.task.title}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline grid */}
          <div className="flex-1 overflow-x-auto">
            <div
              className="relative"
              style={{ minWidth: dateRange.days.length * columnWidth }}
            >
              {/* Date headers */}
              <div className="flex h-14 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                {dateRange.days.map((day, index) => (
                  <div
                    key={index}
                    className={twMerge(
                      clsx(
                        'flex-shrink-0 border-r border-gray-200 dark:border-gray-700 last:border-r-0',
                        'flex flex-col items-center justify-center',
                        isToday(day) && 'bg-primary-50 dark:bg-primary-900/20',
                        isWeekend(day) && 'bg-gray-100 dark:bg-gray-800'
                      )
                    )}
                    style={{ width: columnWidth }}
                  >
                    <span
                      className={twMerge(
                        clsx(
                          'text-xs',
                          isToday(day)
                            ? 'text-primary-600 dark:text-primary-400 font-semibold'
                            : 'text-gray-500 dark:text-gray-400'
                        )
                      )}
                    >
                      {format(day, 'EEE')}
                    </span>
                    <span
                      className={twMerge(
                        clsx(
                          'text-sm font-medium',
                          isToday(day)
                            ? 'text-primary-600 dark:text-primary-400'
                            : 'text-gray-900 dark:text-gray-100'
                        )
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                  </div>
                ))}
              </div>

              {/* Task bars container */}
              <div
                className="relative"
                style={{ height: timelineTasks.rowsNeeded * 40 + 20 }}
              >
                {/* Grid lines */}
                <div className="absolute inset-0 flex pointer-events-none">
                  {dateRange.days.map((day, index) => (
                    <div
                      key={index}
                      className={twMerge(
                        clsx(
                          'flex-shrink-0 border-r border-gray-200 dark:border-gray-700 last:border-r-0',
                          isWeekend(day) && 'bg-gray-50 dark:bg-gray-900/50'
                        )
                      )}
                      style={{ width: columnWidth }}
                    />
                  ))}
                </div>

                {/* Today marker */}
                {todayPosition !== null && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                    style={{ left: `${todayPosition}%` }}
                  >
                    <div className="absolute -top-1 left-1/2 transform -translate-x-1/2">
                      <span className="px-1.5 py-0.5 text-xs font-medium bg-red-500 text-white rounded">
                        Today
                      </span>
                    </div>
                  </div>
                )}

                {/* Task bars */}
                {timelineTasks.tasks.map((item) => (
                  <TimelineTask
                    key={item.task.id}
                    task={item.task}
                    left={item.left}
                    width={item.width}
                    onClick={handleTaskClick}
                    onCreateSubTask={handleCreateSubTask}
                    onDelete={handleDeleteTask}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Empty state */}
        {timelineTasks.tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-gray-500 dark:text-gray-400 mb-2">
              No tasks with date ranges to display
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Add start and due dates to your tasks to see them on the timeline
            </p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
          <div key={key} className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded"
              style={{ backgroundColor: config.color }}
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {config.label}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-2 ml-4">
          <div className="w-0.5 h-4 bg-red-500" />
          <span className="text-sm text-gray-600 dark:text-gray-400">Today</span>
        </div>
      </div>

      {/* Task Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="Edit Task"
        size="lg"
      >
        <TaskForm
          task={selectedTask}
          project={currentProject}
          projectId={currentProject?.id}
          onSubmit={handleSubmit}
          onCancel={handleCloseModal}
          isLoading={isSubmitting}
        />
      </Modal>
    </div>
  );
}

export default TimelineView;
