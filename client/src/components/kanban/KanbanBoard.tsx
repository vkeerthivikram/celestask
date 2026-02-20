'use client';

import React, { useState, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useTasks } from '../../context/TaskContext';
import { useApp } from '../../context/AppContext';
import type { Task, TaskStatus } from '../../types';
import { STATUS_CONFIG } from '../../types';
import KanbanColumn from './KanbanColumn';
import TaskCard from './TaskCard';

// Column configuration
const columns: Array<{ id: TaskStatus; title: string; color: string }> = [
  { id: 'backlog', title: 'Backlog', color: '#6b7280' },
  { id: 'todo', title: 'To Do', color: '#3b82f6' },
  { id: 'in_progress', title: 'In Progress', color: '#f59e0b' },
  { id: 'review', title: 'Review', color: '#8b5cf6' },
  { id: 'done', title: 'Done', color: '#10b981' },
];

export const KanbanBoard: React.FC = () => {
  const { filteredTasks, updateTaskStatus } = useTasks();
  const { openTaskModal } = useApp();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [overColumnId, setOverColumnId] = useState<TaskStatus | null>(null);

  // Configure sensors for drag interactions
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Minimum distance before drag starts
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      backlog: [],
      todo: [],
      in_progress: [],
      review: [],
      done: [],
    };

    filteredTasks.forEach((task) => {
      grouped[task.status].push(task);
    });

    return grouped;
  }, [filteredTasks]);

  // Handle drag start - store the active task
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = filteredTasks.find((t) => t.id === active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  // Handle drag over - update visual indicator for drop target
  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (over) {
      const overId = over.id as TaskStatus;
      if (columns.some((col) => col.id === overId)) {
        setOverColumnId(overId);
      } else {
        // If over a task, find its parent column
        const overTask = filteredTasks.find((t) => t.id === over.id);
        if (overTask) {
          setOverColumnId(overTask.status);
        }
      }
    } else {
      setOverColumnId(null);
    }
  };

  // Handle drag end - update task status
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveTask(null);
    setOverColumnId(null);

    if (!over) return;

    const taskId = active.id as number;
    let newStatus: TaskStatus | null = null;

    // Check if dropped on a column
    const targetColumn = columns.find((col) => col.id === over.id);
    if (targetColumn) {
      newStatus = targetColumn.id;
    } else {
      // Check if dropped on a task
      const targetTask = filteredTasks.find((t) => t.id === over.id);
      if (targetTask) {
        newStatus = targetTask.status;
      }
    }

    // Update status if changed
    const currentTask = filteredTasks.find((t) => t.id === taskId);
    if (newStatus && currentTask && currentTask.status !== newStatus) {
      try {
        await updateTaskStatus(taskId, newStatus);
      } catch (error) {
        console.error('Failed to update task status:', error);
      }
    }
  };

  // Handle task click to open edit modal
  const handleTaskClick = (task: Task) => {
    openTaskModal(task);
  };

  return (
    <div className="h-full w-full overflow-hidden">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div
          className={twMerge(
            clsx(
              'flex gap-4 h-full p-4',
              'overflow-x-auto overflow-y-hidden',
              // Scrollbar styling
              'scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600',
              'scrollbar-track-transparent'
            )
          )}
          role="grid"
          aria-label="Kanban board"
        >
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              id={column.id}
              title={column.title}
              tasks={tasksByStatus[column.id]}
              projectColor={column.color}
              onTaskClick={handleTaskClick}
            />
          ))}
        </div>

        {/* Drag Overlay - Shows preview of dragged item */}
        <DragOverlay>
          {activeTask ? (
            <div className="rotate-[3deg] shadow-2xl">
              <TaskCard task={activeTask} onClick={() => {}} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};

export default KanbanBoard;
