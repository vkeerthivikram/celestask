import type {
  Project,
  Task,
  Person,
  Tag,
  TaskAssignee,
  TaskTag,
  CreateProjectDTO,
  UpdateProjectDTO,
  CreateTaskDTO,
  UpdateTaskDTO,
  CreatePersonDTO,
  UpdatePersonDTO,
  CreateTagDTO,
  UpdateTagDTO,
  TaskFilters,
  ApiResponse,
} from '../types';

const API_BASE_URL = '/api';

// Helper function to handle API responses
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'An error occurred' } }));
    throw new Error(error.error?.message || `HTTP error! status: ${response.status}`);
  }
  const data: ApiResponse<T> = await response.json();
  return data.data;
}

// Build query string from filters
function buildQueryString(filters?: TaskFilters): string {
  if (!filters) return '';
  
  const params = new URLSearchParams();
  
  if (filters.project_id !== undefined) {
    params.append('project_id', filters.project_id.toString());
  }
  if (filters.status) {
    params.append('status', filters.status);
  }
  if (filters.priority) {
    params.append('priority', filters.priority);
  }
  if (filters.due_date_from) {
    params.append('due_date_from', filters.due_date_from);
  }
  if (filters.due_date_to) {
    params.append('due_date_to', filters.due_date_to);
  }
  if (filters.search) {
    params.append('search', filters.search);
  }
  if (filters.assignee_id !== undefined) {
    params.append('assignee_id', filters.assignee_id.toString());
  }
  if (filters.tag_id !== undefined) {
    params.append('tag_id', filters.tag_id.toString());
  }
  
  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

// ============ Projects API ============

export async function getProjects(): Promise<Project[]> {
  const response = await fetch(`${API_BASE_URL}/projects`);
  return handleResponse<Project[]>(response);
}

export async function getProject(id: number): Promise<Project> {
  const response = await fetch(`${API_BASE_URL}/projects/${id}`);
  return handleResponse<Project>(response);
}

export async function createProject(data: CreateProjectDTO): Promise<Project> {
  const response = await fetch(`${API_BASE_URL}/projects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return handleResponse<Project>(response);
}

export async function updateProject(id: number, data: UpdateProjectDTO): Promise<Project> {
  const response = await fetch(`${API_BASE_URL}/projects/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return handleResponse<Project>(response);
}

export async function deleteProject(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/projects/${id}`, {
    method: 'DELETE',
  });
  await handleResponse<{ message: string }>(response);
}

export async function getProjectTasks(projectId: number): Promise<Task[]> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/tasks`);
  return handleResponse<Task[]>(response);
}

// ============ Tasks API ============

export async function getTasks(filters?: TaskFilters): Promise<Task[]> {
  const queryString = buildQueryString(filters);
  const response = await fetch(`${API_BASE_URL}/tasks${queryString}`);
  return handleResponse<Task[]>(response);
}

export async function getTask(id: number): Promise<Task> {
  const response = await fetch(`${API_BASE_URL}/tasks/${id}`);
  return handleResponse<Task>(response);
}

export async function createTask(data: CreateTaskDTO): Promise<Task> {
  const response = await fetch(`${API_BASE_URL}/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return handleResponse<Task>(response);
}

export async function updateTask(id: number, data: UpdateTaskDTO): Promise<Task> {
  const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return handleResponse<Task>(response);
}

export async function updateTaskStatus(id: number, status: Task['status']): Promise<Task> {
  const response = await fetch(`${API_BASE_URL}/tasks/${id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  });
  return handleResponse<Task>(response);
}

export async function deleteTask(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
    method: 'DELETE',
  });
  await handleResponse<{ message: string }>(response);
}

// Task Assignees API
export async function getTaskAssignees(taskId: number): Promise<TaskAssignee[]> {
  const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/assignees`);
  return handleResponse<TaskAssignee[]>(response);
}

export async function addTaskAssignee(taskId: number, data: { person_id: number; role?: string }): Promise<TaskAssignee> {
  const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/assignees`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return handleResponse<TaskAssignee>(response);
}

export async function removeTaskAssignee(taskId: number, personId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/assignees/${personId}`, {
    method: 'DELETE',
  });
  await handleResponse<{ message: string }>(response);
}

export async function setPrimaryAssignee(taskId: number, assigneeId: number): Promise<Task> {
  const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/assignee`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ assignee_id: assigneeId }),
  });
  return handleResponse<Task>(response);
}

// Task Tags API
export async function getTaskTags(taskId: number): Promise<TaskTag[]> {
  const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/tags`);
  return handleResponse<TaskTag[]>(response);
}

export async function addTaskTag(taskId: number, tagId: number): Promise<TaskTag> {
  const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/tags`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ tag_id: tagId }),
  });
  return handleResponse<TaskTag>(response);
}

export async function removeTaskTag(taskId: number, tagId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/tags/${tagId}`, {
    method: 'DELETE',
  });
  await handleResponse<{ message: string }>(response);
}

// ============ People API ============

export async function getPeople(projectId?: number): Promise<Person[]> {
  const queryString = projectId ? `?project_id=${projectId}` : '';
  const response = await fetch(`${API_BASE_URL}/people${queryString}`);
  return handleResponse<Person[]>(response);
}

export async function getPerson(id: number): Promise<Person> {
  const response = await fetch(`${API_BASE_URL}/people/${id}`);
  return handleResponse<Person>(response);
}

export async function createPerson(data: CreatePersonDTO): Promise<Person> {
  const response = await fetch(`${API_BASE_URL}/people`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return handleResponse<Person>(response);
}

export async function updatePerson(id: number, data: UpdatePersonDTO): Promise<Person> {
  const response = await fetch(`${API_BASE_URL}/people/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return handleResponse<Person>(response);
}

export async function deletePerson(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/people/${id}`, {
    method: 'DELETE',
  });
  await handleResponse<{ message: string }>(response);
}

// ============ Tags API ============

export async function getTags(projectId?: number): Promise<Tag[]> {
  const queryString = projectId ? `?project_id=${projectId}` : '';
  const response = await fetch(`${API_BASE_URL}/tags${queryString}`);
  return handleResponse<Tag[]>(response);
}

export async function getTag(id: number): Promise<Tag> {
  const response = await fetch(`${API_BASE_URL}/tags/${id}`);
  return handleResponse<Tag>(response);
}

export async function createTag(data: CreateTagDTO): Promise<Tag> {
  const response = await fetch(`${API_BASE_URL}/tags`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return handleResponse<Tag>(response);
}

export async function updateTag(id: number, data: UpdateTagDTO): Promise<Tag> {
  const response = await fetch(`${API_BASE_URL}/tags/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return handleResponse<Tag>(response);
}

export async function deleteTag(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/tags/${id}`, {
    method: 'DELETE',
  });
  await handleResponse<{ message: string }>(response);
}

// Export all functions as a unified API object
export const api = {
  projects: {
    getAll: getProjects,
    getOne: getProject,
    create: createProject,
    update: updateProject,
    delete: deleteProject,
    getTasks: getProjectTasks,
  },
  tasks: {
    getAll: getTasks,
    getOne: getTask,
    create: createTask,
    update: updateTask,
    updateStatus: updateTaskStatus,
    delete: deleteTask,
    getAssignees: getTaskAssignees,
    addAssignee: addTaskAssignee,
    removeAssignee: removeTaskAssignee,
    setPrimaryAssignee: setPrimaryAssignee,
    getTags: getTaskTags,
    addTag: addTaskTag,
    removeTag: removeTaskTag,
  },
  people: {
    getAll: getPeople,
    getOne: getPerson,
    create: createPerson,
    update: updatePerson,
    delete: deletePerson,
  },
  tags: {
    getAll: getTags,
    getOne: getTag,
    create: createTag,
    update: updateTag,
    delete: deleteTag,
  },
};

export default api;
