// Task Status Types
export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';

// Task Priority Types
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

// View Types
export type ViewType = 'kanban' | 'list' | 'calendar' | 'timeline' | 'dashboard' | 'people';

// Project Interface
export interface Project {
  id: number;
  name: string;
  description: string;
  color: string;
  created_at: string;
  updated_at: string;
}

// Person Interface
export interface Person {
  id: number;
  name: string;
  email?: string;
  company?: string;
  designation?: string;
  project_id?: number;
  created_at: string;
  updated_at: string;
}

// Tag Interface
export interface Tag {
  id: number;
  name: string;
  color: string;
  project_id?: number;
  created_at: string;
  updated_at: string;
}

// Task Assignee Interface (for co-assignees)
export interface TaskAssignee {
  id: number;
  task_id: number;
  person_id: number;
  role: string;
  person?: Person;
  created_at: string;
}

// Task Tag Interface
export interface TaskTag {
  id: number;
  task_id: number;
  tag_id: number;
  tag?: Tag;
  created_at: string;
}

// Task Interface
export interface Task {
  id: number;
  project_id: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  start_date: string | null;
  assignee_id?: number;
  assignee?: Person;
  coAssignees?: TaskAssignee[];
  tags?: TaskTag[];
  created_at: string;
  updated_at: string;
}

// Create/Update DTOs
export interface CreateProjectDTO {
  name: string;
  description?: string;
  color?: string;
}

export interface UpdateProjectDTO {
  name?: string;
  description?: string;
  color?: string;
}

export interface CreatePersonDTO {
  name: string;
  email?: string;
  company?: string;
  designation?: string;
  project_id?: number;
}

export interface UpdatePersonDTO {
  name?: string;
  email?: string;
  company?: string;
  designation?: string;
  project_id?: number;
}

export interface CreateTagDTO {
  name: string;
  color?: string;
  project_id?: number;
}

export interface UpdateTagDTO {
  name?: string;
  color?: string;
  project_id?: number;
}

export interface CreateTaskDTO {
  project_id: number;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string | null;
  start_date?: string | null;
  assignee_id?: number;
}

export interface UpdateTaskDTO {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string | null;
  start_date?: string | null;
  assignee_id?: number;
}

// Task Filters
export interface TaskFilters {
  project_id?: number;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date_from?: string;
  due_date_to?: string;
  search?: string;
  assignee_id?: number;
  tag_id?: number;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// Kanban Column
export interface KanbanColumn {
  status: TaskStatus;
  label: string;
  color: string;
}

// Calendar Event (for react-big-calendar)
export interface CalendarEvent {
  id: number;
  title: string;
  start: Date;
  end: Date;
  resource: Task;
}

// Timeline Task (for Gantt view)
export interface TimelineTask {
  task: Task;
  startDate: Date;
  endDate: Date;
  position: {
    left: number;
    width: number;
  };
}

// Dashboard Stats
export interface DashboardStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  tasksByStatus: Record<TaskStatus, number>;
  tasksByPriority: Record<TaskPriority, number>;
}

// Modal State
export interface ModalState {
  isOpen: boolean;
  type: 'task' | 'project' | 'confirm' | null;
  data?: Task | Project | null;
}

// App State
export interface AppState {
  currentView: ViewType;
  sidebarOpen: boolean;
  modal: ModalState;
}

// Status Configuration
export const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string }> = {
  backlog: { label: 'Backlog', color: '#6b7280' },
  todo: { label: 'To Do', color: '#3b82f6' },
  in_progress: { label: 'In Progress', color: '#f59e0b' },
  review: { label: 'Review', color: '#8b5cf6' },
  done: { label: 'Done', color: '#10b981' },
};

// Priority Configuration
export const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string }> = {
  low: { label: 'Low', color: '#6b7280' },
  medium: { label: 'Medium', color: '#3b82f6' },
  high: { label: 'High', color: '#f59e0b' },
  urgent: { label: 'Urgent', color: '#ef4444' },
};

// Default Project Colors
export const PROJECT_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#8B5CF6', // Purple
  '#F59E0B', // Orange
  '#EF4444', // Red
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#6366F1', // Indigo
];
