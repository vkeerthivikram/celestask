'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Calendar, momentLocalizer, Views, type View } from 'react-big-calendar';
import moment from 'moment';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useTasks } from '../../context/TaskContext';
import { useProjects } from '../../context/ProjectContext';
import type { Task, CalendarEvent, TaskPriority } from '../../types';
import { PRIORITY_CONFIG } from '../../types';
import { Modal } from '../common/Modal';
import { TaskForm } from '../common/TaskForm';
import type { CreateTaskDTO, UpdateTaskDTO } from '../../types';
import TaskEvent from './TaskEvent';

import 'react-big-calendar/lib/css/react-big-calendar.css';

// Setup moment localizer
moment.locale('en');
const localizer = momentLocalizer(moment);

// Priority colors for calendar events
const priorityColors: Record<TaskPriority, string> = {
  low: '#6b7280',
  medium: '#3b82f6',
  high: '#f59e0b',
  urgent: '#ef4444',
};

export function CalendarView() {
  const { tasks, createTask, updateTask } = useTasks();
  const { currentProject } = useProjects();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<View>(Views.MONTH);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Convert tasks to calendar events
  const events: CalendarEvent[] = useMemo(() => {
    return tasks
      .filter((task) => task.due_date)
      .map((task) => ({
        id: task.id,
        title: task.title,
        start: new Date(task.due_date!),
        end: new Date(task.due_date!),
        resource: task,
      }));
  }, [tasks]);

  // Navigate to today
  const handleToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  // Navigate to previous period
  const handlePrev = useCallback(() => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (view === Views.MONTH) {
        newDate.setMonth(newDate.getMonth() - 1);
      } else if (view === Views.WEEK) {
        newDate.setDate(newDate.getDate() - 7);
      } else {
        newDate.setDate(newDate.getDate() - 1);
      }
      return newDate;
    });
  }, [view]);

  // Navigate to next period
  const handleNext = useCallback(() => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (view === Views.MONTH) {
        newDate.setMonth(newDate.getMonth() + 1);
      } else if (view === Views.WEEK) {
        newDate.setDate(newDate.getDate() + 7);
      } else {
        newDate.setDate(newDate.getDate() + 1);
      }
      return newDate;
    });
  }, [view]);

  // Handle event click
  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setSelectedTask(event.resource);
    setSelectedDate(null);
    setIsModalOpen(true);
  }, []);

  // Handle date cell click (create new task)
  const handleSelectSlot = useCallback(({ start }: { start: Date }) => {
    setSelectedTask(null);
    setSelectedDate(start);
    setIsModalOpen(true);
  }, []);

  // Handle modal close
  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedTask(null);
    setSelectedDate(null);
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

  // Custom event component
  const EventComponent = useCallback(
    ({ event }: { event: CalendarEvent }) => (
      <TaskEvent task={event.resource} onClick={() => handleSelectEvent(event)} />
    ),
    [handleSelectEvent]
  );

  // Event style getter
  const eventStyleGetter = useCallback(
    (event: CalendarEvent) => ({
      style: {
        backgroundColor: priorityColors[event.resource.priority],
        borderRadius: '4px',
        border: 'none',
        color: 'white',
        fontSize: '12px',
        padding: '2px 4px',
      },
    }),
    []
  );

  // Get current month/year label
  const getHeaderLabel = () => {
    const options: Intl.DateTimeFormatOptions = {
      month: 'long',
      year: 'numeric',
    };
    if (view === Views.WEEK) {
      options.day = 'numeric';
    }
    return currentDate.toLocaleDateString('en-US', options);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          {/* Navigation buttons */}
          <button
            onClick={handlePrev}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
            aria-label="Previous"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={handleNext}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
            aria-label="Next"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={handleToday}
            className="px-3 py-1.5 text-sm font-medium rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
          >
            Today
          </button>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 ml-2">
            {getHeaderLabel()}
          </h2>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-md shadow-sm">
            {[
              { key: Views.MONTH, label: 'Month' },
              { key: Views.WEEK, label: 'Week' },
            ].map((v) => (
              <button
                key={v.key}
                onClick={() => setView(v.key)}
                className={twMerge(
                  clsx(
                    'px-3 py-1.5 text-sm font-medium',
                    'border border-gray-300 dark:border-gray-600',
                    view === v.key
                      ? 'bg-primary-500 text-white border-primary-500'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                  )
                )}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="flex-1 min-h-[500px] bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <Calendar<CalendarEvent>
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          view={view}
          onView={(newView) => setView(newView)}
          date={currentDate}
          onNavigate={setCurrentDate}
          onSelectEvent={handleSelectEvent}
          onSelectSlot={handleSelectSlot}
          selectable
          components={{
            event: EventComponent,
          }}
          eventPropGetter={eventStyleGetter}
          views={[Views.MONTH, Views.WEEK]}
          className="calendar-dark"
          popup
          tooltipAccessor={(event) =>
            `${event.title}\nPriority: ${PRIORITY_CONFIG[event.resource.priority].label}`
          }
        />
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <span className="text-sm text-gray-600 dark:text-gray-400">Priority:</span>
        {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
          <div key={key} className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: config.color }}
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {config.label}
            </span>
          </div>
        ))}
      </div>

      {/* Task Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={selectedTask ? 'Edit Task' : 'Create Task'}
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

export default CalendarView;
