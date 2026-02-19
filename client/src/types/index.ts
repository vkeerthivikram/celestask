// Task Status Types
export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';

// Task Priority Types
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

// View Types
export type ViewType = 'kanban' | 'list' | 'calendar' | 'timeline' | 'dashboard' | 'people';

// Note Entity Types
export type NoteEntityType = 'project' | 'task' | 'person';

// Project Interface
export interface Project {
  id: number;
  name: string;
  description: string;
  color: string;
  parent_project_id?: number | null;
  owner_id?: number | null;
  owner?: Person;
  assignees?: ProjectAssignee[];
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

// Project Assignee Role Type
export type ProjectAssigneeRole = 'lead' | 'member' | 'observer';

// Project Assignee Interface
export interface ProjectAssignee {
  id: number;
  project_id: number;
  person_id: number;
  role: ProjectAssigneeRole;
  person?: Person;
  created_at: string;
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
  parent_task_id?: number | null;
  progress_percent?: number;
  estimated_duration_minutes?: number;
  actual_duration_minutes?: number;
  created_at: string;
  updated_at: string;
}

// Note Interface
export interface Note {
  id: number;
  content: string;
  entity_type: NoteEntityType;
  entity_id: number;
  created_at: string;
  updated_at: string;
}

// Tree Node Interface (for hierarchical data)
export interface TreeNode<T> {
  data: T;
  children: TreeNode<T>[];
}

// Task Progress Rollup Interface
export interface TaskProgressRollup {
  task_id: number;
  progress_percent: number;
  children_count: number;
  children_progress: TaskProgressRollup[];
}

// Create/Update DTOs
export interface CreateProjectDTO {
  name: string;
  description?: string;
  color?: string;
  parent_project_id?: number | null;
  owner_id?: number | null;
}

export interface UpdateProjectDTO {
  name?: string;
  description?: string;
  color?: string;
  parent_project_id?: number | null;
  owner_id?: number | null;
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
  parent_task_id?: number | null;
  progress_percent?: number;
  estimated_duration_minutes?: number;
  actual_duration_minutes?: number;
}

export interface UpdateTaskDTO {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string | null;
  start_date?: string | null;
  assignee_id?: number;
  parent_task_id?: number | null;
  progress_percent?: number;
  estimated_duration_minutes?: number;
  actual_duration_minutes?: number;
}

// Note DTOs
export interface CreateNoteDTO {
  entity_type: NoteEntityType;
  entity_id: number;
  content: string;
}

export interface UpdateNoteDTO {
  content: string;
}

// Progress Update DTO
export interface UpdateTaskProgressDTO {
  progress_percent?: number;
  estimated_duration_minutes?: number;
  actual_duration_minutes?: number;
}

// Move DTO (for reorganizing hierarchy)
export interface MoveEntityDTO {
  parent_id: number | null;
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

// CreateProjectAssigneeDTO
export interface CreateProjectAssigneeDTO {
  project_id: number;
  person_id: number;
  role: ProjectAssigneeRole;
}

// Bulk Update DTO for batch task operations
export interface BulkUpdateDTO {
  taskIds: number[];
  updates: {
    status?: TaskStatus;
    priority?: TaskPriority;
    assignee_id?: number | null;
  };
}

// Bulk Update Response
export interface BulkUpdateResponse {
  updated: number;
  tasks: Task[];
}

// ==================== v1.6.0 Custom Fields & Saved Views ====================

// Custom Field Type
export type CustomFieldType = 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'checkbox' | 'url';

// Custom Field Interface
export interface CustomField {
  id: string;
  name: string;
  field_type: CustomFieldType;
  project_id?: string | null;
  options?: string[];  // For select/multiselect
  required: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// Custom Field Value Interface
export interface CustomFieldValue {
  id: string;
  task_id: string;
  custom_field_id: string;
  custom_field?: CustomField;
  value: string | string[] | number | boolean | null;
  created_at: string;
  updated_at: string;
}

// Create Custom Field DTO
export interface CreateCustomFieldDTO {
  name: string;
  field_type: CustomFieldType;
  project_id?: string | null;
  options?: string[];
  required?: boolean;
  sort_order?: number;
}

// Update Custom Field DTO
export interface UpdateCustomFieldDTO {
  name?: string;
  field_type?: CustomFieldType;
  project_id?: string | null;
  options?: string[];
  required?: boolean;
  sort_order?: number;
}

// Set Custom Field Value DTO
export interface SetCustomFieldValueDTO {
  value: string | string[] | number | boolean | null;
}

// Saved View Type
export type SavedViewType = 'list' | 'kanban' | 'calendar' | 'timeline';

// Saved View Interface
export interface SavedView {
  id: string;
  name: string;
  view_type: SavedViewType;
  project_id?: string | null;
  filters: TaskFilters;
  sort_by?: string;
  sort_order: 'asc' | 'desc';
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// Create Saved View DTO
export interface CreateSavedViewDTO {
  name: string;
  view_type: SavedViewType;
  project_id?: string | null;
  filters: TaskFilters;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  is_default?: boolean;
}

// Update Saved View DTO
export interface UpdateSavedViewDTO {
  name?: string;
  view_type?: SavedViewType;
  project_id?: string | null;
  filters?: TaskFilters;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  is_default?: boolean;
}
