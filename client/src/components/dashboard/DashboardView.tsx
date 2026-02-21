'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, subWeeks, startOfWeek, endOfWeek, eachWeekOfInterval, isWithinInterval } from 'date-fns';
import {
  CheckCircle2,
  Clock,
  ListTodo,
  AlertTriangle,
  ClipboardList,
  Activity,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { useTasks } from '../../context/TaskContext';
import { useProjects } from '../../context/ProjectContext';
import { useApp } from '../../context/AppContext';
import type { Task, TaskStatus, TaskPriority, CreateTaskDTO, UpdateTaskDTO } from '../../types';
import { STATUS_CONFIG, PRIORITY_CONFIG } from '../../types';
import { Modal } from '../common/Modal';
import { TaskForm } from '../common/TaskForm';
import { Card } from '../common/Card';
import StatCard from './StatCard';
import UpcomingDeadlines from './UpcomingDeadlines';
import { AppContextMenu } from '../common/AppContextMenu';

// Chart colors
const CHART_COLORS = {
  backlog: '#6b7280',
  todo: '#3b82f6',
  in_progress: '#f59e0b',
  review: '#8b5cf6',
  done: '#10b981',
  low: '#6b7280',
  medium: '#3b82f6',
  high: '#f59e0b',
  urgent: '#ef4444',
};

export function DashboardView() {
  const { tasks, createTask, updateTask, deleteTask } = useTasks();
  const { currentProject } = useProjects();
  const { openSubTaskModal } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contextMenuState, setContextMenuState] = useState<{ x: number; y: number; task: Task } | null>(null);

  // Calculate statistics
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === 'done').length;
    const inProgressTasks = tasks.filter((t) => t.status === 'in_progress').length;
    const overdueTasks = tasks.filter(
      (t) => t.due_date && new Date(t.due_date) < today && t.status !== 'done'
    ).length;

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      overdueTasks,
    };
  }, [tasks]);

  // Status distribution data for pie chart
  const statusDistribution = useMemo(() => {
    const distribution: Record<TaskStatus, number> = {
      backlog: 0,
      todo: 0,
      in_progress: 0,
      review: 0,
      done: 0,
    };

    tasks.forEach((task) => {
      distribution[task.status]++;
    });

    return Object.entries(distribution).map(([status, count]) => ({
      name: STATUS_CONFIG[status as TaskStatus].label,
      value: count,
      color: STATUS_CONFIG[status as TaskStatus].color,
      status: status as TaskStatus,
    }));
  }, [tasks]);

  // Priority distribution data for bar chart
  const priorityDistribution = useMemo(() => {
    const distribution: Record<TaskPriority, number> = {
      low: 0,
      medium: 0,
      high: 0,
      urgent: 0,
    };

    tasks.forEach((task) => {
      distribution[task.priority]++;
    });

    return Object.entries(distribution).map(([priority, count]) => ({
      name: PRIORITY_CONFIG[priority as TaskPriority].label,
      value: count,
      color: PRIORITY_CONFIG[priority as TaskPriority].color,
      priority: priority as TaskPriority,
    }));
  }, [tasks]);

  // Tasks timeline data for area chart (last 8 weeks)
  const tasksTimeline = useMemo(() => {
    const today = new Date();
    const eightWeeksAgo = subWeeks(today, 7);
    const weeks = eachWeekOfInterval({ start: eightWeeksAgo, end: today });

    return weeks.map((weekStart) => {
      const weekEnd = endOfWeek(weekStart);
      const weekLabel = format(weekStart, 'MMM d');

      const created = tasks.filter((task) => {
        const createdDate = new Date(task.created_at);
        return isWithinInterval(createdDate, { start: weekStart, end: weekEnd });
      }).length;

      const completed = tasks.filter((task) => {
        if (task.status !== 'done') return false;
        const updatedDate = new Date(task.updated_at);
        return isWithinInterval(updatedDate, { start: weekStart, end: weekEnd });
      }).length;

      return {
        week: weekLabel,
        created,
        completed,
      };
    });
  }, [tasks]);

  // Recent activity (last 5 updated tasks)
  const recentActivity = useMemo(() => {
    return [...tasks]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 5);
  }, [tasks]);

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

  const closeContextMenu = useCallback(() => {
    setContextMenuState(null);
  }, []);

  const contextMenuItems = useMemo(() => {
    if (!contextMenuState) {
      return [];
    }

    const { task } = contextMenuState;
    return [
      {
        id: 'open-task',
        label: 'Open task',
        onSelect: () => handleTaskClick(task),
      },
      {
        id: 'create-sub-task',
        label: 'Add sub-task',
        onSelect: () => handleCreateSubTask(task.id),
      },
      {
        id: 'delete-task',
        label: 'Delete task',
        onSelect: () => {
          void handleDeleteTask(task);
        },
        danger: true,
      },
    ];
  }, [contextMenuState, handleCreateSubTask, handleDeleteTask, handleTaskClick]);

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

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Tasks"
          value={stats.totalTasks}
          icon={ListTodo}
          color="blue"
        />
        <StatCard
          title="Completed"
          value={stats.completedTasks}
          icon={CheckCircle2}
          color="green"
          subtitle={`${Math.round((stats.completedTasks / (stats.totalTasks || 1)) * 100)}% complete`}
        />
        <StatCard
          title="In Progress"
          value={stats.inProgressTasks}
          icon={Clock}
          color="amber"
        />
        <StatCard
          title="Overdue"
          value={stats.overdueTasks}
          icon={AlertTriangle}
          color="red"
          subtitle={stats.overdueTasks > 0 ? 'Needs attention' : 'All on track'}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution Pie Chart */}
        <Card variant="bordered" padding="lg">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Status Distribution
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value: string) => (
                    <span className="text-sm text-gray-600 dark:text-gray-400">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Priority Distribution Bar Chart */}
        <Card variant="bordered" padding="lg">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Priority Distribution
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityDistribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                <XAxis type="number" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: '#9CA3AF', fontSize: 12 }}
                  width={60}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {priorityDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Tasks Timeline Chart */}
      <Card variant="bordered" padding="lg">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Tasks Timeline (Last 8 Weeks)
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={tasksTimeline}>
              <defs>
                <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
              <XAxis
                dataKey="week"
                tick={{ fill: '#9CA3AF', fontSize: 12 }}
              />
              <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                height={36}
                formatter={(value: string) => (
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {value === 'created' ? 'Tasks Created' : 'Tasks Completed'}
                  </span>
                )}
              />
              <Area
                type="monotone"
                dataKey="created"
                stroke="#3b82f6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorCreated)"
              />
              <Area
                type="monotone"
                dataKey="completed"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorCompleted)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Bottom Row: Upcoming Deadlines & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Deadlines */}
        <Card variant="bordered" padding="lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Upcoming Deadlines
            </h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Next 7 days
            </span>
          </div>
          <UpcomingDeadlines
            tasks={tasks}
            onTaskClick={handleTaskClick}
            onCreateSubTask={handleCreateSubTask}
            onDeleteTask={handleDeleteTask}
            maxItems={5}
          />
        </Card>

        {/* Recent Activity */}
        <Card variant="bordered" padding="lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Recent Activity
            </h3>
            <Activity className="w-5 h-5 text-gray-400" />
          </div>
          {recentActivity.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <ClipboardList className="w-12 h-12 text-gray-400 mb-3" />
              <p className="text-gray-600 dark:text-gray-400">
                No recent activity
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((task) => (
                <button
                  key={task.id}
                  onClick={() => handleTaskClick(task)}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    setContextMenuState({ x: event.clientX, y: event.clientY, task });
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
                      event.preventDefault();
                      const rect = (event.currentTarget as HTMLButtonElement).getBoundingClientRect();
                      setContextMenuState({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, task });
                    }
                  }}
                  className={twMerge(
                    clsx(
                      'w-full text-left p-3 rounded-lg',
                      'bg-gray-50 dark:bg-gray-900/50',
                      'hover:bg-gray-100 dark:hover:bg-gray-900',
                      'transition-colors duration-150',
                      'focus:outline-none focus:ring-2 focus:ring-primary-500'
                    )
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                        {task.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: STATUS_CONFIG[task.status].color }}
                        />
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {STATUS_CONFIG[task.status].label}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                      {format(new Date(task.updated_at), 'MMM d, h:mm a')}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>

      <AppContextMenu
        open={Boolean(contextMenuState)}
        x={contextMenuState?.x ?? 0}
        y={contextMenuState?.y ?? 0}
        items={contextMenuItems}
        onClose={closeContextMenu}
      />

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

export default DashboardView;
