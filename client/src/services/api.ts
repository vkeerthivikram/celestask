import type {
  Project,
  Task,
  Person,
  Tag,
  TaskAssignee,
  TaskTag,
  Note,
  TreeNode,
  TaskProgressRollup,
  CreateProjectDTO,
  UpdateProjectDTO,
  CreateTaskDTO,
  UpdateTaskDTO,
  CreatePersonDTO,
  UpdatePersonDTO,
  CreateTagDTO,
  UpdateTagDTO,
  CreateNoteDTO,
  UpdateNoteDTO,
  UpdateTaskProgressDTO,
  MoveEntityDTO,
  TaskFilters,
  ApiResponse,
  ProjectAssignee,
  ProjectAssigneeRole,
  CreateProjectAssigneeDTO,
  BulkUpdateDTO,
  BulkUpdateResponse,
  CustomField,
  CustomFieldValue,
  CreateCustomFieldDTO,
  UpdateCustomFieldDTO,
  SetCustomFieldValueDTO,
  SavedView,
  CreateSavedViewDTO,
  UpdateSavedViewDTO,
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

// ============ Notes API ============

export async function getNotes(entityType: string, entityId: number): Promise<Note[]> {
  const response = await fetch(`${API_BASE_URL}/notes?entity_type=${entityType}&entity_id=${entityId}`);
  return handleResponse<Note[]>(response);
}

export async function getNote(id: number): Promise<Note> {
  const response = await fetch(`${API_BASE_URL}/notes/${id}`);
  return handleResponse<Note>(response);
}

export async function createNote(data: CreateNoteDTO): Promise<Note> {
  const response = await fetch(`${API_BASE_URL}/notes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return handleResponse<Note>(response);
}

export async function updateNote(id: number, data: UpdateNoteDTO): Promise<Note> {
  const response = await fetch(`${API_BASE_URL}/notes/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return handleResponse<Note>(response);
}

export async function deleteNote(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/notes/${id}`, {
    method: 'DELETE',
  });
  await handleResponse<{ message: string }>(response);
}

// ============ Project Hierarchy API ============

export async function getRootProjects(): Promise<Project[]> {
  const response = await fetch(`${API_BASE_URL}/projects/root`);
  return handleResponse<Project[]>(response);
}

export async function getProjectChildren(id: number): Promise<Project[]> {
  const response = await fetch(`${API_BASE_URL}/projects/${id}/children`);
  return handleResponse<Project[]>(response);
}

export async function getProjectDescendants(id: number): Promise<Project[]> {
  const response = await fetch(`${API_BASE_URL}/projects/${id}/descendants`);
  return handleResponse<Project[]>(response);
}

export async function getProjectTree(id: number): Promise<TreeNode<Project>> {
  const response = await fetch(`${API_BASE_URL}/projects/${id}/tree`);
  return handleResponse<TreeNode<Project>>(response);
}

export async function createSubProject(parentId: number, data: CreateProjectDTO): Promise<Project> {
  const response = await fetch(`${API_BASE_URL}/projects/${parentId}/subprojects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return handleResponse<Project>(response);
}

export async function moveProject(id: number, parentId: number | null): Promise<Project> {
  const response = await fetch(`${API_BASE_URL}/projects/${id}/move`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ parent_id: parentId } as MoveEntityDTO),
  });
  return handleResponse<Project>(response);
}

// ============ Project Assignments API ============

export async function setProjectOwner(projectId: number, personId: number | null): Promise<Project> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/owner`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ owner_id: personId }),
  });
  return handleResponse<Project>(response);
}

export async function getProjectAssignees(projectId: number): Promise<ProjectAssignee[]> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/assignees`);
  return handleResponse<ProjectAssignee[]>(response);
}

export async function addProjectAssignee(projectId: number, data: CreateProjectAssigneeDTO): Promise<ProjectAssignee> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/assignees`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return handleResponse<ProjectAssignee>(response);
}

export async function removeProjectAssignee(projectId: number, assigneeId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/assignees/${assigneeId}`, {
    method: 'DELETE',
  });
  await handleResponse<{ message: string }>(response);
}

// ============ Task Hierarchy API ============

export async function getTaskChildren(id: number): Promise<Task[]> {
  const response = await fetch(`${API_BASE_URL}/tasks/${id}/children`);
  return handleResponse<Task[]>(response);
}

export async function getTaskDescendants(id: number): Promise<Task[]> {
  const response = await fetch(`${API_BASE_URL}/tasks/${id}/descendants`);
  return handleResponse<Task[]>(response);
}

export async function getTaskTree(id: number): Promise<TreeNode<Task>> {
  const response = await fetch(`${API_BASE_URL}/tasks/${id}/tree`);
  return handleResponse<TreeNode<Task>>(response);
}

export async function createSubTask(parentId: number, data: CreateTaskDTO): Promise<Task> {
  const response = await fetch(`${API_BASE_URL}/tasks/${parentId}/subtasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return handleResponse<Task>(response);
}

export async function moveTask(id: number, parentId: number | null): Promise<Task> {
  const response = await fetch(`${API_BASE_URL}/tasks/${id}/move`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ parent_id: parentId } as MoveEntityDTO),
  });
  return handleResponse<Task>(response);
}

export async function getRootTasks(projectId: number): Promise<Task[]> {
  const response = await fetch(`${API_BASE_URL}/projects/${projectId}/tasks/root`);
  return handleResponse<Task[]>(response);
}

// ============ Task Progress API ============

export async function updateTaskProgress(id: number, data: UpdateTaskProgressDTO): Promise<Task> {
  const response = await fetch(`${API_BASE_URL}/tasks/${id}/progress`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return handleResponse<Task>(response);
}

export async function getTaskProgressRollup(id: number): Promise<TaskProgressRollup> {
  const response = await fetch(`${API_BASE_URL}/tasks/${id}/progress/rollup`);
  return handleResponse<TaskProgressRollup>(response);
}

// ============ Bulk Operations API ============

export async function bulkUpdateTasks(data: BulkUpdateDTO): Promise<BulkUpdateResponse> {
  const response = await fetch(`${API_BASE_URL}/tasks/bulk`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return handleResponse<BulkUpdateResponse>(response);
}

export async function bulkDeleteTasks(taskIds: number[]): Promise<{ deleted: number }> {
  const response = await fetch(`${API_BASE_URL}/tasks/bulk`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ taskIds }),
  });
  return handleResponse<{ deleted: number }>(response);
}

// ============ Custom Fields API ============

export async function getCustomFields(projectId?: string): Promise<CustomField[]> {
  const queryString = projectId ? `?project_id=${projectId}` : '';
  const response = await fetch(`${API_BASE_URL}/custom-fields${queryString}`);
  return handleResponse<CustomField[]>(response);
}

export async function getCustomField(id: string): Promise<CustomField> {
  const response = await fetch(`${API_BASE_URL}/custom-fields/${id}`);
  return handleResponse<CustomField>(response);
}

export async function createCustomField(data: CreateCustomFieldDTO): Promise<CustomField> {
  const response = await fetch(`${API_BASE_URL}/custom-fields`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return handleResponse<CustomField>(response);
}

export async function updateCustomField(id: string, data: Partial<UpdateCustomFieldDTO>): Promise<CustomField> {
  const response = await fetch(`${API_BASE_URL}/custom-fields/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return handleResponse<CustomField>(response);
}

export async function deleteCustomField(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/custom-fields/${id}`, {
    method: 'DELETE',
  });
  await handleResponse<{ message: string }>(response);
}

// Custom Field Values API
export async function getTaskCustomFields(taskId: number): Promise<CustomFieldValue[]> {
  const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/custom-fields`);
  return handleResponse<CustomFieldValue[]>(response);
}

export async function setTaskCustomField(
  taskId: number,
  fieldId: string,
  value: SetCustomFieldValueDTO['value']
): Promise<CustomFieldValue> {
  const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/custom-fields/${fieldId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ value }),
  });
  return handleResponse<CustomFieldValue>(response);
}

export async function deleteTaskCustomField(taskId: number, fieldId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/custom-fields/${fieldId}`, {
    method: 'DELETE',
  });
  await handleResponse<{ message: string }>(response);
}

// ============ Saved Views API ============

export async function getSavedViews(projectId?: string, viewType?: string): Promise<SavedView[]> {
  const params = new URLSearchParams();
  if (projectId) params.append('project_id', projectId);
  if (viewType) params.append('view_type', viewType);
  const queryString = params.toString() ? `?${params.toString()}` : '';
  
  const response = await fetch(`${API_BASE_URL}/saved-views${queryString}`);
  return handleResponse<SavedView[]>(response);
}

export async function getSavedView(id: string): Promise<SavedView> {
  const response = await fetch(`${API_BASE_URL}/saved-views/${id}`);
  return handleResponse<SavedView>(response);
}

export async function createSavedView(data: CreateSavedViewDTO): Promise<SavedView> {
  const response = await fetch(`${API_BASE_URL}/saved-views`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return handleResponse<SavedView>(response);
}

export async function updateSavedView(id: string, data: Partial<UpdateSavedViewDTO>): Promise<SavedView> {
  const response = await fetch(`${API_BASE_URL}/saved-views/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return handleResponse<SavedView>(response);
}

export async function deleteSavedView(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/saved-views/${id}`, {
    method: 'DELETE',
  });
  await handleResponse<{ message: string }>(response);
}

export async function setDefaultView(id: string): Promise<SavedView> {
  const response = await fetch(`${API_BASE_URL}/saved-views/${id}/default`, {
    method: 'PUT',
  });
  return handleResponse<SavedView>(response);
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
    getRoot: getRootProjects,
    getChildren: getProjectChildren,
    getDescendants: getProjectDescendants,
    getTree: getProjectTree,
    createSub: createSubProject,
    move: moveProject,
    setOwner: setProjectOwner,
    getAssignees: getProjectAssignees,
    addAssignee: addProjectAssignee,
    removeAssignee: removeProjectAssignee,
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
    getChildren: getTaskChildren,
    getDescendants: getTaskDescendants,
    getTree: getTaskTree,
    createSub: createSubTask,
    move: moveTask,
    updateProgress: updateTaskProgress,
    getProgressRollup: getTaskProgressRollup,
    getRoot: getRootTasks,
    bulkUpdate: bulkUpdateTasks,
    bulkDelete: bulkDeleteTasks,
    getCustomFields: getTaskCustomFields,
    setCustomField: setTaskCustomField,
    deleteCustomField: deleteTaskCustomField,
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
  notes: {
    getAll: getNotes,
    getOne: getNote,
    create: createNote,
    update: updateNote,
    delete: deleteNote,
  },
  customFields: {
    getAll: getCustomFields,
    getOne: getCustomField,
    create: createCustomField,
    update: updateCustomField,
    delete: deleteCustomField,
  },
  savedViews: {
    getAll: getSavedViews,
    getOne: getSavedView,
    create: createSavedView,
    update: updateSavedView,
    delete: deleteSavedView,
    setDefault: setDefaultView,
  },
};

export default api;
