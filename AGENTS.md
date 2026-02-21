# Celestask - Comprehensive AI Agent Documentation

## 1. Project Overview

Celestask is a local-first, single-user project management application inspired by Jira. It provides a full-stack solution for managing projects, tasks, people, and tags with multiple view types (Kanban, List, Calendar, Timeline, Dashboard).

### Architecture Summary
- **Monorepo Structure**: Root directory contains `server/` (Express backend) and `client/` (Next.js frontend)
- **Database**: SQLite with better-sqlite3 (synchronous API)
- **Frontend**: Next.js 15 App Router with React Context for state management
- **API Communication**: RESTful JSON API with Next.js rewrites proxying to Express

### Node.js Version Requirement
- **Node.js 22+** (specified in `engines` field: `>=22 <25`)

---

## 2. Tech Stack (Detailed)

### Backend (server/)

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 22+ | Runtime environment |
| Express | ^4.18.2 | Web framework |
| better-sqlite3 | ^12.6.2 | SQLite database driver (synchronous API) |
| cors | ^2.8.5 | Cross-origin resource sharing |
| date-fns | ^3.2.0 | Date manipulation |

**Server Port**: `19096` (configurable via `PORT` env var)

**CORS Configuration**:
```javascript
origin: ['http://localhost:12096', 'http://127.0.0.1:12096'],
methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
credentials: true
```

### Frontend (client/)

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | ^15.5.12 | React framework with App Router |
| React | ^18.2.0 | UI library |
| TypeScript | ^5.3.3 | Type safety |
| Tailwind CSS | ^3.3.6 | Utility-first CSS |
| @radix-ui/* | Various | shadcn/ui primitives (dialog, dropdown-menu, select, slot) |
| @dnd-kit/* | ^6.1.0+ | Drag-and-drop functionality |
| recharts | ^2.10.0 | Charts and visualizations |
| react-big-calendar | ^1.8.5 | Calendar view |
| lucide-react | ^0.294.0 | Icon library |
| date-fns | ^2.30.0 | Date manipulation |
| react-markdown | ^9.0.0 | Markdown rendering |
| class-variance-authority | ^0.7.0 | Component variants |
| clsx | ^2.0.0 | Conditional classnames |
| tailwind-merge | ^2.2.0 | Tailwind class merging |
| tailwindcss-animate | ^1.0.7 | Animation utilities |

**Client Dev Server Port**: `12096` (configured in `package.json` scripts)

---

## 3. Project Structure (Complete File Tree)

```
celestask/
├── AGENTS.md                    # This documentation file
├── docker-compose.yml           # Production Docker Compose
├── docker-compose.dev.yml       # Development Docker Compose override
├── README.md                    # Project documentation
├── docs/
│   └── ROADMAP.md              # Product roadmap
├── package.json                 # Root package.json with workspace scripts
├── package-lock.json
├── Makefile                     # Build and development commands
│
├── server/                      # Backend Express application
│   ├── Dockerfile               # Production backend image
│   ├── package.json
│   ├── index.js                 # Server entry point with all route imports
│   ├── data/
│   │   └── celestask.db          # SQLite database file
│   ├── db/
│   │   ├── database.js          # SQLite connection (better-sqlite3)
│   │   ├── schema.js            # Table definitions with migrations
│   │   └── seed.js              # Sample data seeder
│   └── routes/
│       ├── projects.js          # Projects API (14 endpoints)
│       ├── tasks.js             # Tasks API (29 endpoints)
│       ├── people.js            # People API (5 endpoints)
│       ├── tags.js              # Tags API (5 endpoints)
│       ├── notes.js             # Notes API (5 endpoints)
│       ├── customFields.js      # Custom Fields API (5 endpoints)
│       ├── savedViews.js        # Saved Views API (6 endpoints)
│       └── importExport.js      # Import/Export API (4 endpoints)
│
└── client/                      # Frontend Next.js application
  ├── Dockerfile               # Production image (Next.js standalone)
  ├── Dockerfile.dev           # Development image
    ├── package.json
    ├── next.config.mjs          # Next.js config with API rewrites
    ├── tailwind.config.js       # Tailwind CSS configuration
    ├── components.json          # shadcn/ui configuration
    ├── tsconfig.json            # TypeScript configuration
    ├── postcss.config.js        # PostCSS configuration
    ├── next-env.d.ts
    └── src/
        ├── app/                 # Next.js App Router
        │   ├── layout.tsx       # Root layout with Providers
        │   ├── page.tsx         # Home page (redirects to first project)
        │   ├── icon.svg         # App/browser icon (moon-over-sun mark)
        │   ├── providers.tsx    # Context provider hierarchy
        │   ├── global-ui.tsx    # Global UI components (toasts, modals)
        │   ├── globals.css      # Global styles and CSS variables
        │   ├── people/
        │   │   └── page.tsx     # People management page
        │   └── projects/
        │       └── [projectId]/
        │           └── [view]/
        │               └── page.tsx  # Dynamic project view page
        │
        ├── types/
        │   └── index.ts         # All TypeScript type definitions
        │
        ├── services/
        │   └── api.ts           # Centralized API service layer
        │
        ├── hooks/
        │   └── useKeyboardShortcuts.ts  # Keyboard shortcut hook
        │
        ├── context/             # React Context providers (11 contexts)
        │   ├── AppContext.tsx
        │   ├── ToastContext.tsx
        │   ├── ProjectContext.tsx
        │   ├── TaskContext.tsx
        │   ├── PeopleContext.tsx
        │   ├── TagContext.tsx
        │   ├── NoteContext.tsx
        │   ├── CustomFieldContext.tsx
        │   ├── SavedViewContext.tsx
        │   ├── ShortcutContext.tsx
        │   └── CommandPaletteContext.tsx
        │
        └── components/
            ├── ui/              # UI components (6 files)
            │   ├── button.tsx
            │   ├── card.tsx
            │   ├── badge.tsx
            │   ├── dialog.tsx
            │   └── dropdown-menu.tsx
            │   └── Logo.tsx
            │
            ├── common/          # Reusable components (32 files)
            │   ├── Button.tsx, Card.tsx, Badge.tsx, Modal.tsx
            │   ├── AppContextMenu.tsx
            │   ├── ProgressBar.tsx
            │   ├── TreeView.tsx
            │   ├── ProjectTreeNode.tsx, TaskTreeNode.tsx
            │   ├── TaskProgressIndicator.tsx
            │   ├── ProjectForm.tsx, TaskForm.tsx, PersonForm.tsx, TagForm.tsx
            │   ├── CustomFieldForm.tsx, CustomFieldInput.tsx
            │   ├── SavedViewsDropdown.tsx, SaveViewModal.tsx
            │   ├── CommandPalette.tsx
            │   ├── QuickAddTask.tsx
            │   ├── Toast.tsx, ToastContainer.tsx
            │   ├── BulkActionBar.tsx
            │   ├── Breadcrumbs.tsx
            │   ├── ShortcutHelp.tsx
            │   ├── NoteCard.tsx, NoteEditor.tsx, NotesPanel.tsx
            │   └── ImportExportPanel.tsx
            │
            ├── layout/          # Layout components (3 files)
            │   ├── Layout.tsx
            │   ├── Header.tsx
            │   └── Sidebar.tsx
            │
            ├── kanban/          # Kanban board (3 files)
            │   ├── KanbanBoard.tsx
            │   ├── KanbanColumn.tsx
            │   └── TaskCard.tsx
            │
            ├── list/            # List view (5 files)
            │   ├── ListView.tsx
            │   ├── TaskRow.tsx
            │   ├── TaskListItem.tsx
            │   ├── SortHeader.tsx
            │   └── FilterBar.tsx
            │
            ├── calendar/        # Calendar view (2 files)
            │   ├── CalendarView.tsx
            │   └── TaskEvent.tsx
            │
            ├── timeline/        # Timeline view (2 files)
            │   ├── TimelineView.tsx
            │   └── TimelineTask.tsx
            │
            ├── dashboard/       # Dashboard view (3 files)
            │   ├── DashboardView.tsx
            │   ├── StatCard.tsx
            │   └── UpcomingDeadlines.tsx
            │
            └── people/          # People view (1 file)
                └── PeopleView.tsx
```

---

## 4. Development Commands

All commands are run from the repository root:

| Command | Description |
|---------|-------------|
| `make install` | Install all dependencies (root + server + client) |
| `make dev` | Start both servers (backend + frontend) in development mode |
| `make server` | Start backend server only (port 19096) |
| `make client` | Start frontend dev server only (port 12096) |
| `make build` | Build frontend for production |
| `make clean` | Remove node_modules from all directories |
| `make reinstall` | Clean and reinstall all dependencies |
| `make db-reset` | Delete the SQLite database and reseed with sample data |
| `make help` | Display available commands |

### Root package.json Scripts

| Script | Command |
|--------|---------|
| `npm run install:all` | Install dependencies in root, server, and client |
| `npm run server` | Start backend server |
| `npm run client` | Start frontend dev server |
| `npm run dev` | Run both servers concurrently |
| `npm run start` | Same as `dev` |

---

## 5. Server Architecture

### 5.1 Database Schema (11 Tables)

#### 1. projects
| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| id | INTEGER | PRIMARY KEY | AUTOINCREMENT |
| name | TEXT | NOT NULL | - |
| description | TEXT | - | NULL |
| color | TEXT | - | '#3B82F6' |
| parent_project_id | INTEGER | REFERENCES projects(id) ON DELETE SET NULL | NULL |
| owner_id | TEXT | REFERENCES people(id) ON DELETE SET NULL | NULL |
| created_at | DATETIME | - | CURRENT_TIMESTAMP |
| updated_at | DATETIME | - | CURRENT_TIMESTAMP |

**Indexes**: `idx_projects_parent_id`, `idx_projects_owner_id`

#### 2. tasks
| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| id | INTEGER | PRIMARY KEY | AUTOINCREMENT |
| project_id | INTEGER | NOT NULL, REFERENCES projects(id) ON DELETE CASCADE | - |
| title | TEXT | NOT NULL | - |
| description | TEXT | - | NULL |
| status | TEXT | - | 'todo' |
| priority | TEXT | - | 'medium' |
| due_date | DATE | - | NULL |
| start_date | DATE | - | NULL |
| end_date | DATE | - | NULL |
| assignee_id | TEXT | REFERENCES people(id) | NULL |
| parent_task_id | INTEGER | REFERENCES tasks(id) ON DELETE SET NULL | NULL |
| progress_percent | INTEGER | - | 0 |
| estimated_duration_minutes | INTEGER | - | NULL |
| actual_duration_minutes | INTEGER | - | NULL |
| created_at | DATETIME | - | CURRENT_TIMESTAMP |
| updated_at | DATETIME | - | CURRENT_TIMESTAMP |

**Indexes**: `idx_tasks_project_id`, `idx_tasks_status`, `idx_tasks_priority`, `idx_tasks_due_date`, `idx_tasks_assignee_id`, `idx_tasks_parent_id`

**Valid status values**: `backlog`, `todo`, `in_progress`, `review`, `done`
**Valid priority values**: `low`, `medium`, `high`, `urgent`

#### 3. people
| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| id | TEXT | PRIMARY KEY | UUID |
| name | TEXT | NOT NULL | - |
| email | TEXT | - | NULL |
| company | TEXT | - | NULL |
| designation | TEXT | - | NULL |
| project_id | INTEGER | REFERENCES projects(id) ON DELETE SET NULL | NULL |
| created_at | DATETIME | - | CURRENT_TIMESTAMP |
| updated_at | DATETIME | - | CURRENT_TIMESTAMP |

**Indexes**: `idx_people_project_id`

#### 4. tags
| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| id | TEXT | PRIMARY KEY | UUID |
| name | TEXT | NOT NULL | - |
| color | TEXT | - | '#6B7280' |
| project_id | INTEGER | REFERENCES projects(id) ON DELETE SET NULL | NULL |
| created_at | DATETIME | - | CURRENT_TIMESTAMP |
| updated_at | DATETIME | - | CURRENT_TIMESTAMP |

**Indexes**: `idx_tags_project_id`

#### 5. task_assignees
| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| id | TEXT | PRIMARY KEY | UUID |
| task_id | INTEGER | NOT NULL, REFERENCES tasks(id) ON DELETE CASCADE | - |
| person_id | TEXT | NOT NULL, REFERENCES people(id) ON DELETE CASCADE | - |
| role | TEXT | - | 'collaborator' |
| created_at | DATETIME | - | CURRENT_TIMESTAMP |

**Indexes**: `idx_task_assignees_task_id`, `idx_task_assignees_person_id`
**Unique constraint**: `(task_id, person_id)`

#### 6. task_tags
| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| id | TEXT | PRIMARY KEY | UUID |
| task_id | INTEGER | NOT NULL, REFERENCES tasks(id) ON DELETE CASCADE | - |
| tag_id | TEXT | NOT NULL, REFERENCES tags(id) ON DELETE CASCADE | - |
| created_at | DATETIME | - | CURRENT_TIMESTAMP |

**Indexes**: `idx_task_tags_task_id`, `idx_task_tags_tag_id`
**Unique constraint**: `(task_id, tag_id)`

#### 7. notes
| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| id | TEXT | PRIMARY KEY | UUID |
| content | TEXT | NOT NULL | - |
| entity_type | TEXT | NOT NULL | - |
| entity_id | TEXT | NOT NULL | - |
| created_at | DATETIME | - | CURRENT_TIMESTAMP |
| updated_at | DATETIME | - | CURRENT_TIMESTAMP |

**Indexes**: `idx_notes_entity(entity_type, entity_id)`
**Valid entity_type values**: `project`, `task`, `person`

#### 8. project_assignees
| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| id | TEXT | PRIMARY KEY | UUID |
| project_id | INTEGER | NOT NULL, REFERENCES projects(id) ON DELETE CASCADE | - |
| person_id | TEXT | NOT NULL, REFERENCES people(id) ON DELETE CASCADE | - |
| role | TEXT | CHECK(role IN ('lead', 'member', 'observer')) | 'member' |
| created_at | DATETIME | - | CURRENT_TIMESTAMP |

**Indexes**: `idx_project_assignees_project_id`, `idx_project_assignees_person_id`
**Unique constraint**: `(project_id, person_id)`

#### 9. custom_fields
| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| id | TEXT | PRIMARY KEY | UUID |
| name | TEXT | NOT NULL | - |
| field_type | TEXT | NOT NULL, CHECK(field_type IN ('text', 'number', 'date', 'select', 'multiselect', 'checkbox', 'url')) | - |
| project_id | INTEGER | REFERENCES projects(id) ON DELETE CASCADE | NULL |
| options | TEXT | JSON array for select/multiselect | NULL |
| required | INTEGER | - | 0 |
| sort_order | INTEGER | - | 0 |
| created_at | DATETIME | - | CURRENT_TIMESTAMP |
| updated_at | DATETIME | - | CURRENT_TIMESTAMP |

**Indexes**: `idx_custom_fields_project`

#### 10. custom_field_values
| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| id | TEXT | PRIMARY KEY | UUID |
| task_id | INTEGER | NOT NULL, REFERENCES tasks(id) ON DELETE CASCADE | - |
| custom_field_id | TEXT | NOT NULL, REFERENCES custom_fields(id) ON DELETE CASCADE | - |
| value | TEXT | Serialized value | NULL |
| created_at | DATETIME | - | CURRENT_TIMESTAMP |
| updated_at | DATETIME | - | CURRENT_TIMESTAMP |

**Indexes**: `idx_custom_field_values_task`, `idx_custom_field_values_field`
**Unique constraint**: `(task_id, custom_field_id)`

#### 11. saved_views
| Column | Type | Constraints | Default |
|--------|------|-------------|---------|
| id | TEXT | PRIMARY KEY | UUID |
| name | TEXT | NOT NULL | - |
| view_type | TEXT | NOT NULL, CHECK(view_type IN ('list', 'kanban', 'calendar', 'timeline')) | - |
| project_id | INTEGER | REFERENCES projects(id) ON DELETE CASCADE | NULL |
| filters | TEXT | NOT NULL (JSON) | - |
| sort_by | TEXT | - | NULL |
| sort_order | TEXT | - | 'asc' |
| is_default | INTEGER | - | 0 |
| created_at | DATETIME | - | CURRENT_TIMESTAMP |
| updated_at | DATETIME | - | CURRENT_TIMESTAMP |

**Indexes**: `idx_saved_views_project`, `idx_saved_views_type`

### 5.2 API Routes (73 Endpoints Total)

#### Projects API (14 endpoints)

| Method | Endpoint | Description | Request Body |
|--------|----------|-------------|--------------|
| GET | `/api/projects` | List all projects | - |
| GET | `/api/projects/root` | Get root projects (no parent) | - |
| GET | `/api/projects/:id` | Get single project | - |
| POST | `/api/projects` | Create project | `{ name, description?, color?, parent_project_id? }` |
| PUT | `/api/projects/:id` | Update project | `{ name?, description?, color?, parent_project_id? }` |
| DELETE | `/api/projects/:id` | Delete project | - |
| GET | `/api/projects/:id/children` | Get direct children | - |
| GET | `/api/projects/:id/descendants` | Get all descendants (recursive CTE) | - |
| GET | `/api/projects/:id/ancestors` | Get all ancestors (recursive CTE) | - |
| GET | `/api/projects/:id/tree` | Get full nested tree | - |
| POST | `/api/projects/:parentId/subprojects` | Create sub-project | `{ name, description?, color? }` |
| PUT | `/api/projects/:id/move` | Move to new parent | `{ parent_id }` |
| PUT | `/api/projects/:id/owner` | Set project owner | `{ person_id }` |
| GET/POST/DELETE | `/api/projects/:id/assignees` | Team management | Various |

#### Tasks API (29 endpoints)

| Method | Endpoint | Description | Query Params / Request Body |
|--------|----------|-------------|----------------------------|
| GET | `/api/tasks` | List with filters | `projectId, status, priority, search, assignee_id, tag_id, parent_task_id` |
| GET | `/api/tasks/:id` | Single with relations | - |
| POST | `/api/tasks` | Create task | Full CreateTaskDTO |
| PUT | `/api/tasks/:id` | Update task | Full UpdateTaskDTO |
| PATCH | `/api/tasks/:id/status` | Update status only | `{ status }` |
| DELETE | `/api/tasks/:id` | Delete task | - |
| GET | `/api/tasks/:id/children` | Direct children | - |
| GET | `/api/tasks/:id/descendants` | All descendants | - |
| GET | `/api/tasks/:id/ancestors` | All ancestors | - |
| GET | `/api/tasks/:id/tree` | Full nested tree | - |
| POST | `/api/tasks/:parentId/subtasks` | Create sub-task | Partial CreateTaskDTO |
| PUT | `/api/tasks/:id/move` | Move to new parent | `{ parent_id }` |
| PUT | `/api/tasks/:id/progress` | Update progress | `{ progress_percent?, estimated_duration_minutes?, actual_duration_minutes? }` |
| GET | `/api/tasks/:id/progress/rollup` | Progress with children | - |
| GET | `/api/tasks/:id/assignees` | Get co-assignees | - |
| POST | `/api/tasks/:id/assignees` | Add co-assignee | `{ person_id, role? }` |
| DELETE | `/api/tasks/:id/assignees/:personId` | Remove co-assignee | - |
| PUT | `/api/tasks/:id/assignee` | Set primary assignee | `{ assignee_id }` |
| GET | `/api/tasks/:id/tags` | Get task tags | - |
| POST | `/api/tasks/:id/tags` | Add tag | `{ tag_id }` |
| DELETE | `/api/tasks/:id/tags/:tagId` | Remove tag | - |
| GET | `/api/tasks/:id/custom-fields` | Get custom field values | - |
| PUT | `/api/tasks/:id/custom-fields/:fieldId` | Set custom field value | `{ value }` |
| DELETE | `/api/tasks/:id/custom-fields/:fieldId` | Remove custom field | - |
| PUT | `/api/tasks/bulk` | Bulk update | `{ taskIds: number[], updates: { status?, priority?, assignee_id? } }` |

#### People API (5 endpoints)

| Method | Endpoint | Description | Query Params / Request Body |
|--------|----------|-------------|----------------------------|
| GET | `/api/people` | List all people | `?project_id=number` |
| GET | `/api/people/:id` | Get single person | - |
| POST | `/api/people` | Create person | `{ name, email?, company?, designation?, project_id? }` |
| PUT | `/api/people/:id` | Update person | Same fields |
| DELETE | `/api/people/:id` | Delete person | - |

#### Tags API (5 endpoints)

| Method | Endpoint | Description | Query Params / Request Body |
|--------|----------|-------------|----------------------------|
| GET | `/api/tags` | List tags (global + project) | `?project_id=number` |
| GET | `/api/tags/:id` | Get single tag | - |
| POST | `/api/tags` | Create tag | `{ name, color?, project_id? }` |
| PUT | `/api/tags/:id` | Update tag | Same fields |
| DELETE | `/api/tags/:id` | Delete tag | - |

#### Notes API (5 endpoints)

| Method | Endpoint | Description | Query Params / Request Body |
|--------|----------|-------------|----------------------------|
| GET | `/api/notes` | List notes | `?entity_type=string&entity_id=number` |
| GET | `/api/notes/:id` | Get single note | - |
| POST | `/api/notes` | Create note | `{ content, entity_type, entity_id }` |
| PUT | `/api/notes/:id` | Update note | `{ content }` |
| DELETE | `/api/notes/:id` | Delete note | - |

#### Custom Fields API (5 endpoints)

| Method | Endpoint | Description | Query Params / Request Body |
|--------|----------|-------------|----------------------------|
| GET | `/api/custom-fields` | List fields (global + project) | `?project_id=string` |
| GET | `/api/custom-fields/:id` | Get single field | - |
| POST | `/api/custom-fields` | Create field | `{ name, field_type, project_id?, options?, required?, sort_order? }` |
| PUT | `/api/custom-fields/:id` | Update field | Same fields |
| DELETE | `/api/custom-fields/:id` | Delete field | - |

#### Saved Views API (6 endpoints)

| Method | Endpoint | Description | Query Params / Request Body |
|--------|----------|-------------|----------------------------|
| GET | `/api/saved-views` | List saved views | `?project_id=string&view_type=string` |
| GET | `/api/saved-views/:id` | Get single view | - |
| POST | `/api/saved-views` | Create view | `{ name, view_type, project_id?, filters, sort_by?, sort_order?, is_default? }` |
| PUT | `/api/saved-views/:id` | Update view | Same fields |
| DELETE | `/api/saved-views/:id` | Delete view | - |
| PUT | `/api/saved-views/:id/set-default` | Set as default | - |

#### Import/Export API (4 endpoints)

| Method | Endpoint | Description | Response |
|--------|----------|-------------|----------|
| GET | `/api/export` | Export all data as JSON | File download |
| GET | `/api/export/sqlite` | Download database file | Binary file |
| GET | `/api/export/status` | Get database statistics | `{ version, tableStats, totalRecords }` |
| POST | `/api/import` | Import data | `?mode=merge|replace`, Body: ImportPayload |

#### Health Check

| Method | Endpoint | Description | Response |
|--------|----------|-------------|----------|
| GET | `/api/health` | Health check | `{ status: "ok", timestamp }` |

### 5.3 Error Handling

**Standard Response Format**:
```typescript
// Success
{ success: true, data: T }

// Error
{ success: false, error: { code: string, message: string } }
```

**Error Codes**:
| Code | HTTP Status | Description |
|------|-------------|-------------|
| `FETCH_ERROR` | 500 | Failed to fetch data |
| `CREATE_ERROR` | 500 | Failed to create entity |
| `UPDATE_ERROR` | 500 | Failed to update entity |
| `DELETE_ERROR` | 500 | Failed to delete entity |
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `NOT_FOUND` | 404 | Entity not found |
| `CONFLICT_ERROR` | 409 | Duplicate/conflict |
| `DUPLICATE_ERROR` | 400 | Duplicate relationship |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## 6. Client Architecture

### 6.1 Next.js App Router Pages

| File | Route | Description |
|------|-------|-------------|
| `app/layout.tsx` | - | Root layout with Providers and GlobalUI |
| `app/page.tsx` | `/` | Home page (redirects to first project) |
| `app/people/page.tsx` | `/people` | People management |
| `app/projects/[projectId]/[view]/page.tsx` | `/projects/:id/:view` | Dynamic project views |

**View types**: `kanban`, `list`, `calendar`, `timeline`, `dashboard`

### 6.2 Context Providers (11 Contexts)

**Provider Hierarchy** (from `app/providers.tsx`):
```
AppProvider
  → ToastProvider
    → ProjectProvider
      → PeopleProvider
        → TagProvider
          → ShortcutProvider
            → CommandPaletteProvider
              → CustomFieldProvider
                → TaskProvider (scoped to current project)
                  → SavedViewProvider
                    → NoteProvider
```

#### 1. AppContext (`context/AppContext.tsx`)
**Purpose**: Global application state

**State**:
- `currentView: ViewType` - Current active view
- `currentProjectId: number | null` - Selected project ID
- `sidebarOpen: boolean` - Sidebar visibility
- `modal: ModalState` - Modal state (type, data, isOpen)
- `darkMode: boolean` - Theme preference

**Actions**:
- `setCurrentView`, `setCurrentProjectId`
- `toggleSidebar`, `setSidebarOpen`
- `openTaskModal`, `openProjectModal`, `openConfirmModal`, `openImportExportModal`, `closeModal`
- `toggleDarkMode`

**Hook**: `useApp()`

#### 2. ToastContext (`context/ToastContext.tsx`)
**Purpose**: Toast notification system

**State**:
- `toasts: Toast[]` - Array of active toasts (max 5)

**Actions**:
- `showToast(options)` - Show custom toast
- `dismissToast(id)` - Dismiss specific toast
- `dismissAllToasts()` - Clear all toasts
- `success(title, message?, options?)` - Success toast
- `error(title, message?, options?)` - Error toast
- `warning(title, message?, options?)` - Warning toast
- `info(title, message?, options?)` - Info toast

**Default durations**: success=4s, info=4s, warning=5s, error=6s

**Hook**: `useToast()`

#### 3. ProjectContext (`context/ProjectContext.tsx`)
**Purpose**: Projects data and CRUD operations

**State**:
- `projects: Project[]` - All projects
- `currentProject: Project | null` - Selected project
- `currentProjectAssignees: ProjectAssignee[]` - Project team
- `loading: boolean`, `error: string | null`

**Actions**:
- `fetchProjects()` - Fetch all projects
- `setCurrentProject(project)`, `setCurrentProjectById(id)`
- `createProject(data)`, `updateProject(id, data)`, `deleteProject(id)`
- Hierarchy: `fetchRootProjects()`, `fetchProjectTree(id)`, `getProjectChildren(id)`, `createSubProject(parentId, data)`, `moveProject(id, parentId)`
- Assignments: `setProjectOwner(projectId, personId)`, `fetchProjectAssignees(projectId)`, `addProjectAssignee(projectId, data)`, `removeProjectAssignee(projectId, assigneeId)`

**Helpers**:
- `getProjectAncestors(projects, projectId)` - Get ancestor chain
- `useProjectSelection()` - Project selection hook

**Hook**: `useProjects()`

#### 4. TaskContext (`context/TaskContext.tsx`)
**Purpose**: Tasks data with filtering, selection, and CRUD

**State**:
- `tasks: Task[]` - All tasks
- `filteredTasks: Task[]` - Filtered by current filters
- `selectedTaskIds: number[]` - Bulk selection state
- `filters: TaskFilters` - Current filter state
- `loading: boolean`, `error: string | null`

**Selection**:
- `isTaskSelected(id)`, `isAllSelected`, `isPartialSelected`
- `toggleTaskSelection(id)`, `selectAllTasks()`, `clearSelection()`

**Filters**:
- `setFilters(filters)`, `updateFilter(key, value)`, `clearFilters()`

**Actions**:
- `fetchTasks(filters?)`, `fetchTasksByProject(projectId)`
- `createTask(data)`, `updateTask(id, data)`, `updateTaskStatus(id, status)`, `deleteTask(id)`
- Bulk: `bulkUpdateTasks(updates)`, `bulkDeleteTasks()`
- Assignees: `setPrimaryAssignee(taskId, personId)`, `addCoAssignee(taskId, personId, role?)`, `removeCoAssignee(taskId, personId)`
- Tags: `addTagToTask(taskId, tagId)`, `removeTagFromTask(taskId, tagId)`
- Hierarchy: `fetchTaskTree(id)`, `getTaskChildren(id)`, `createSubTask(parentId, data)`, `moveTask(id, parentId)`, `fetchRootTasks(projectId)`
- Progress: `updateTaskProgress(id, data)`, `getTaskProgressRollup(id)`

**Helpers**:
- `getTaskById(id)`, `getTasksByStatus(status)`

**Hook**: `useTasks()`

#### 5. PeopleContext (`context/PeopleContext.tsx`)
**Purpose**: People/team management

**State**:
- `people: Person[]` - All people
- `projectPeople: Person[]` - Filtered for current project
- `loading: boolean`, `error: string | null`

**Actions**:
- `fetchPeople()`, `fetchPeopleByProject(projectId)`
- `createPerson(data)`, `updatePerson(id, data)`, `deletePerson(id)`
- `getPersonById(id)`

**Hook**: `usePeople()`

#### 6. TagContext (`context/TagContext.tsx`)
**Purpose**: Tag management

**State**:
- `tags: Tag[]` - All tags
- `availableTags: Tag[]` - Global + project-specific tags
- `loading: boolean`, `error: string | null`

**Actions**:
- `fetchTags()`, `fetchAvailableTags(projectId)`
- `createTag(data)`, `updateTag(id, data)`, `deleteTag(id)`
- `getTagById(id)`

**Hook**: `useTags()`

#### 7. NoteContext (`context/NoteContext.tsx`)
**Purpose**: Notes for entities

**State**:
- `notes: Note[]` - Notes for current entity
- `currentEntity: { type, id } | null` - Current context
- `loading: boolean`, `error: string | null`

**Actions**:
- `fetchNotes(entityType, entityId)`
- `createNote(data)`, `updateNote(id, data)`, `deleteNote(id)`
- `clearNotes()`

**Hook**: `useNotes()`

#### 8. CustomFieldContext (`context/CustomFieldContext.tsx`)
**Purpose**: Custom field definitions and values

**State**:
- `customFields: CustomField[]` - All field definitions
- `availableFields: CustomField[]` - Fields for current project
- `taskFieldValues: Map<string, CustomFieldValue[]>` - Cache by task ID
- `loading: boolean`, `error: string | null`

**Field Definition Actions**:
- `fetchCustomFields(projectId?)`
- `createCustomField(data)`, `updateCustomField(id, data)`, `deleteCustomField(id)`

**Field Value Actions**:
- `fetchTaskCustomFields(taskId)`, `setTaskCustomField(taskId, fieldId, value)`, `deleteTaskCustomField(taskId, fieldId)`
- `clearTaskFieldValues(taskId)`

**Helpers**:
- `getCustomFieldById(id)`, `getTaskFieldValue(taskId, fieldId)`

**Hook**: `useCustomFields()`

#### 9. SavedViewContext (`context/SavedViewContext.tsx`)
**Purpose**: Saved filter configurations

**State**:
- `savedViews: SavedView[]` - All saved views
- `defaultView: SavedView | null` - Default for current context
- `loading: boolean`, `error: string | null`

**Actions**:
- `fetchSavedViews(projectId?, viewType?)`
- `createSavedView(data)`, `updateSavedView(id, data)`, `deleteSavedView(id)`
- `setDefaultView(id)`

**Helpers**:
- `getSavedViewById(id)`, `getViewsForType(viewType)`
- `applySavedView(view)` - Returns `{ filters, sortBy, sortOrder }`

**Hook**: `useSavedViews()`

#### 10. ShortcutContext (`context/ShortcutContext.tsx`)
**Purpose**: Keyboard shortcut management

**State**:
- `shortcuts: ShortcutConfig[]` - All shortcut definitions
- `isHelpOpen: boolean` - Help modal state

**Actions**:
- `openHelp()`, `closeHelp()`, `toggleHelp()`
- `isShortcutEnabled(id)` - Check if shortcut is active

**Hook**: `useShortcuts()`

#### 11. CommandPaletteContext (`context/CommandPaletteContext.tsx`)
**Purpose**: Command palette state (Cmd+K)

**State**:
- `isOpen: boolean`

**Actions**:
- `openPalette()`, `closePalette()`, `togglePalette()`

**Hook**: `useCommandPalette()`

### 6.3 API Service Layer

File: `client/src/services/api.ts`

**Helper Functions**:
```typescript
handleResponse<T>(response: Response): Promise<T>
  // Extracts data from ApiResponse wrapper, throws on error

buildQueryString(filters?: TaskFilters): string
  // Serializes filters to URL query string
```

**API Functions** (organized by category):

| Category | Functions |
|----------|-----------|
| Projects | `getProjects`, `getProject`, `createProject`, `updateProject`, `deleteProject`, `getProjectTasks`, `getRootProjects`, `getProjectChildren`, `getProjectDescendants`, `getProjectTree`, `createSubProject`, `moveProject`, `setProjectOwner`, `getProjectAssignees`, `addProjectAssignee`, `removeProjectAssignee` |
| Tasks | `getTasks`, `getTask`, `createTask`, `updateTask`, `updateTaskStatus`, `deleteTask`, `getTaskAssignees`, `addTaskAssignee`, `removeTaskAssignee`, `setPrimaryAssignee`, `getTaskTags`, `addTaskTag`, `removeTaskTag`, `getTaskChildren`, `getTaskDescendants`, `getTaskTree`, `createSubTask`, `moveTask`, `getRootTasks`, `updateTaskProgress`, `getTaskProgressRollup`, `bulkUpdateTasks`, `bulkDeleteTasks`, `getTaskCustomFields`, `setTaskCustomField`, `deleteTaskCustomField` |
| People | `getPeople`, `getPerson`, `createPerson`, `updatePerson`, `deletePerson` |
| Tags | `getTags`, `getTag`, `createTag`, `updateTag`, `deleteTag` |
| Notes | `getNotes`, `getNote`, `createNote`, `updateNote`, `deleteNote` |
| Custom Fields | `getCustomFields`, `getCustomField`, `createCustomField`, `updateCustomField`, `deleteCustomField` |
| Saved Views | `getSavedViews`, `getSavedView`, `createSavedView`, `updateSavedView`, `deleteSavedView`, `setDefaultView` |
| Import/Export | `exportData`, `exportSqlite`, `getExportStatus`, `importData` |

**Unified Export**:
```typescript
export const api = {
  projects: { getAll, getOne, create, update, delete, ... },
  tasks: { getAll, getOne, create, update, delete, ... },
  people: { getAll, getOne, create, update, delete },
  tags: { getAll, getOne, create, update, delete },
  notes: { getAll, getOne, create, update, delete },
  customFields: { getAll, getOne, create, update, delete },
  savedViews: { getAll, getOne, create, update, delete, setDefault },
  importExport: { exportData, exportSqlite, getExportStatus, importData },
};
```

### 6.4 TypeScript Types

File: `client/src/types/index.ts`

**Union Types**:
```typescript
type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done'
type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
type ViewType = 'kanban' | 'list' | 'calendar' | 'timeline' | 'dashboard' | 'people'
type NoteEntityType = 'project' | 'task' | 'person'
type ProjectAssigneeRole = 'lead' | 'member' | 'observer'
type CustomFieldType = 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'checkbox' | 'url'
type SavedViewType = 'list' | 'kanban' | 'calendar' | 'timeline'
type ImportMode = 'merge' | 'replace'
```

**Core Interfaces**:
- `Project` - Project entity with hierarchy support
- `Task` - Task entity with full metadata
- `Person` - Team member/contact
- `Tag` - Task tag
- `Note` - Markdown notes for entities
- `ProjectAssignee`, `TaskAssignee`, `TaskTag` - Relationship interfaces
- `CustomField`, `CustomFieldValue` - Custom field system
- `SavedView` - Saved filter configuration

**DTOs**:
- `CreateProjectDTO`, `UpdateProjectDTO`
- `CreateTaskDTO`, `UpdateTaskDTO`
- `CreatePersonDTO`, `UpdatePersonDTO`
- `CreateTagDTO`, `UpdateTagDTO`
- `CreateNoteDTO`, `UpdateNoteDTO`
- `CreateCustomFieldDTO`, `UpdateCustomFieldDTO`, `SetCustomFieldValueDTO`
- `CreateSavedViewDTO`, `UpdateSavedViewDTO`
- `BulkUpdateDTO`

**Utility Types**:
- `TreeNode<T>` - Generic tree structure
- `TaskFilters` - Filter configuration
- `ApiResponse<T>`, `ApiErrorResponse` - API response types
- `ModalState`, `AppState` - UI state types
- `ExportStatus`, `ImportPayload`, `ImportResult` - Import/export types

**Constants**:
```typescript
STATUS_CONFIG: Record<TaskStatus, { label: string; color: string }>
PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string }>
PROJECT_COLORS: string[] // 8 default colors
```

### 6.5 Custom Hooks

#### useKeyboardShortcuts (`hooks/useKeyboardShortcuts.ts`)
```typescript
interface ShortcutDefinition {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: () => void;
  description?: string;
  enabled?: boolean;
}

useKeyboardShortcuts({
  shortcuts: ShortcutDefinition[],
  enabled?: boolean,
  preventDefault?: boolean,
}): void
```

**Features**:
- Detects input/textarea/contenteditable elements (skips shortcuts)
- Normalizes keys for case-insensitive matching
- Handles Mac vs Windows modifier keys (Cmd vs Ctrl)

#### Context Hooks
All context hooks follow the pattern `use[ContextName]()`:
- `useApp()`, `useToast()`, `useProjects()`, `useTasks()`
- `usePeople()`, `useTags()`, `useNotes()`, `useCustomFields()`
- `useSavedViews()`, `useShortcuts()`, `useCommandPalette()`

### 6.6 Components (51 Components)

#### UI Components (6 files)
Located in `components/ui/`:

| Component | Description | Variants |
|-----------|-------------|----------|
| `button.tsx` | Button component | default, destructive, outline, secondary, ghost, link |
| `card.tsx` | Card compound component | Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent |
| `badge.tsx` | Badge/label component | default, secondary, destructive, outline |
| `dialog.tsx` | Modal dialog | Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription |
| `dropdown-menu.tsx` | Dropdown menu | DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, etc. |
| `Logo.tsx` | Celestask moon-over-sun brand mark | `main`, `navbar` |

#### Common Components (31 files)
Located in `components/common/`:

| Category | Components |
|----------|------------|
| **Base UI** | `Button.tsx`, `Card.tsx`, `Badge.tsx`, `Modal.tsx` |
| **Progress** | `ProgressBar.tsx`, `TaskProgressIndicator.tsx` |
| **Tree** | `TreeView.tsx`, `ProjectTreeNode.tsx`, `TaskTreeNode.tsx` |
| **Forms** | `ProjectForm.tsx`, `TaskForm.tsx`, `PersonForm.tsx`, `TagForm.tsx`, `CustomFieldForm.tsx`, `CustomFieldInput.tsx` |
| **Saved Views** | `SavedViewsDropdown.tsx`, `SaveViewModal.tsx` |
| **Commands** | `CommandPalette.tsx`, `QuickAddTask.tsx` |
| **Feedback** | `Toast.tsx`, `ToastContainer.tsx`, `ShortcutHelp.tsx` |
| **Navigation** | `Breadcrumbs.tsx`, `BulkActionBar.tsx` |
| **Notes** | `NoteCard.tsx`, `NoteEditor.tsx`, `NotesPanel.tsx` |
| **Data** | `ImportExportPanel.tsx` |

#### Layout Components (3 files)
Located in `components/layout/`:

| Component | Description |
|-----------|-------------|
| `Layout.tsx` | Main app shell with sidebar, header, modals |
| `Header.tsx` | Top bar with breadcrumbs, quick add, dark mode toggle |
| `Sidebar.tsx` | Navigation with views list and project tree |

#### Kanban Components (3 files)
Located in `components/kanban/`:

| Component | Description |
|-----------|-------------|
| `KanbanBoard.tsx` | Drag-drop board using @dnd-kit |
| `KanbanColumn.tsx` | Droppable status column |
| `TaskCard.tsx` | Draggable task card |

#### List Components (5 files)
Located in `components/list/`:

| Component | Description |
|-----------|-------------|
| `ListView.tsx` | Table view with filters and bulk ops |
| `TaskRow.tsx` | Desktop table row |
| `TaskListItem.tsx` | Mobile card view |
| `SortHeader.tsx` | Sortable column header |
| `FilterBar.tsx` | Search and filter controls |

#### Calendar Components (2 files)
Located in `components/calendar/`:

| Component | Description |
|-----------|-------------|
| `CalendarView.tsx` | Monthly calendar using react-big-calendar |
| `TaskEvent.tsx` | Event renderer |

#### Timeline Components (2 files)
Located in `components/timeline/`:

| Component | Description |
|-----------|-------------|
| `TimelineView.tsx` | Gantt-style visualization |
| `TimelineTask.tsx` | Task bar component |

#### Dashboard Components (3 files)
Located in `components/dashboard/`:

| Component | Description |
|-----------|-------------|
| `DashboardView.tsx` | Statistics with recharts |
| `StatCard.tsx` | Stat display card |
| `UpcomingDeadlines.tsx` | Deadline list |

#### People Components (1 file)
Located in `components/people/`:

| Component | Description |
|-----------|-------------|
| `PeopleView.tsx` | Team management grid |

---

## 7. Configuration Files

### Root package.json
```json
{
  "name": "celestask",
  "version": "1.0.0",
  "engines": { "node": ">=22 <25" },
  "scripts": {
    "install:all": "npm install && cd server && npm install && cd ../client && npm install",
    "server": "cd server && npm run dev",
    "client": "cd client && npm run dev",
    "dev": "concurrently \"npm run server\" \"npm run client\""
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
```

### Server package.json
```json
{
  "name": "task-manager-server",
  "version": "1.0.0",
  "main": "index.js",
  "engines": { "node": ">=22 <25" },
  "scripts": {
    "start": "node index.js",
    "dev": "node index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "better-sqlite3": "^12.6.2",
    "date-fns": "^3.2.0"
  }
}
```

### Client package.json
```json
{
  "name": "celestask-client",
  "version": "0.0.0",
  "scripts": {
    "dev": "next dev -p 12096",
    "build": "next build",
    "start": "next start -p 12096",
    "lint": "next lint"
  }
}
```

### next.config.mjs
```javascript
const nextConfig = {
  outputFileTracingRoot: __dirname,
  typescript: {
    ignoreBuildErrors: process.env.NEXT_IGNORE_BUILD_ERRORS === 'true',
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `http://localhost:${process.env.BACKEND_PORT || '19096'}/api/:path*`,
      },
    ];
  },
};
```

### tailwind.config.js
```javascript
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: { /* 50-950 scale */ },
        priority: { low, medium, high, urgent },
        status: { backlog, todo, 'in-progress', review, done },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
```

### components.json (shadcn/ui)
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "src/app/globals.css",
    "baseColor": "slate"
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

### tsconfig.json (Client)
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "strict": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

---

## 8. Key Design Patterns

### Context-based State Management
- All data flows through React Context
- Contexts auto-fetch on mount (via `useEffect`)
- ToastContext used for all user feedback
- TaskProvider scoped to current project

### API Layer
- Centralized in `api.ts` with generic `handleResponse` helper
- Dual export: named functions + unified `api` object
- Query string builder for filter serialization

### URL as Source of Truth
- Project ID and view type derived from URL params (`[projectId]/[view]`)
- Contexts sync with URL changes via `useEffect`

### Drag and Drop
- Uses `@dnd-kit` for accessibility
- Keyboard navigation support
- Optimistic updates for status changes

### Tree Structures
- Self-referential foreign keys (`parent_project_id`, `parent_task_id`)
- Recursive CTEs in SQL for ancestors/descendants
- Generic `TreeView` component with render props

### Error Handling
- Standardized `{ success, data/error }` response format
- Global error handler middleware in Express
- Error codes for programmatic handling

---

## 9. Status and Priority Values

### Task Statuses

| Status | Label | Color | Hex |
|--------|-------|-------|-----|
| `backlog` | Backlog | Gray | `#6b7280` |
| `todo` | To Do | Blue | `#3b82f6` |
| `in_progress` | In Progress | Amber | `#f59e0b` |
| `review` | Review | Purple | `#8b5cf6` |
| `done` | Done | Green | `#10b981` |

### Task Priorities

| Priority | Label | Color | Hex |
|----------|-------|-------|-----|
| `low` | Low | Gray | `#6b7280` |
| `medium` | Medium | Blue | `#3b82f6` |
| `high` | High | Amber | `#f59e0b` |
| `urgent` | Urgent | Red | `#ef4444` |

### Project Assignment Roles

| Role | Description |
|------|-------------|
| `lead` | Project lead with full access |
| `member` | Team member with standard access |
| `observer` | Read-only access |

### Custom Field Types

| Type | Description | Storage |
|------|-------------|---------|
| `text` | Single-line text | String |
| `number` | Numeric value | Number as string |
| `date` | Date picker | YYYY-MM-DD string |
| `select` | Single selection | String (from options) |
| `multiselect` | Multiple selections | JSON array string |
| `checkbox` | Boolean toggle | "true"/"false" string |
| `url` | URL/link | String |

---

## 10. Keyboard Shortcuts

| Key | Action | Category |
|-----|--------|----------|
| `/` | Focus search | Navigation |
| `n` | Create new task | Actions |
| `p` | Create new project | Actions |
| `1` | Go to Dashboard | Views |
| `2` | Go to Kanban | Views |
| `3` | Go to List | Views |
| `4` | Go to Calendar | Views |
| `5` | Go to Timeline | Views |
| `6` | Go to People | Views |
| `?` (Shift+/) | Show keyboard shortcuts | System |
| `Escape` | Close modal / Cancel | System |
| `Ctrl/Cmd+K` | Open command palette | System |

**Note**: Shortcuts are disabled when focus is in input/textarea/contenteditable elements (except Escape).

---

## 11. Version History

### v1.0.0 - Initial Release
- Core CRUD operations
- SQLite database with better-sqlite3
- React frontend with Vite
- REST API with Express

### v1.1.0 - Task Assignments
- Added `assignee_id` to tasks
- Primary assignee support
- People integration

### v1.2.0 - Nested Hierarchy & Progress Tracking
- Nested projects via `parent_project_id`
- Nested tasks via `parent_task_id`
- Progress tracking (0-100%)
- Time estimates (`estimated_duration_minutes`, `actual_duration_minutes`)
- Notes system with markdown support
- Tree view components

**Database Changes**:
- Added `parent_project_id` to `projects`
- Added `parent_task_id`, `progress_percent`, `estimated_duration_minutes`, `actual_duration_minutes` to `tasks`
- Created `notes` table

### v1.3.0 - Project Assignments
- Project owner (`owner_id`)
- Project team with roles (`lead`, `member`, `observer`)

**Database Changes**:
- Added `owner_id` to `projects`
- Created `project_assignees` table

### v1.6.0 - Custom Fields & Saved Views
- 7 custom field types
- Project-specific or global fields
- Saved filter configurations
- Default view setting

**Database Changes**:
- Created `custom_fields` table
- Created `custom_field_values` table
- Created `saved_views` table

### v2.0.0 - Next.js & shadcn/ui Migration (2026-02-20)
- Migrated from Vite + React SPA to Next.js 15 App Router
- Integrated shadcn/ui components (Radix-based)
- Configured API rewrites for seamless backend proxy
- Added "use client" directives for stateful contexts
- Updated all routing to file-based App Router

**Files Changed**:
- New `app/` directory structure
- New `components/ui/` for shadcn components
- `next.config.mjs` with rewrites
- `components.json` for shadcn configuration
- Removed `vite.config.ts`, `index.html`

### v2.1.0 - UX, Theming, Docker & Branding Refresh (2026-02-21)
- Added Docker support across backend/frontend (`Dockerfile`, `.dockerignore`, compose files)
- Added backend host/port configurability in Next.js rewrites for containerized and local setups
- Added task `end_date` support across DB schema, API routes, forms, and view rendering
- Introduced reusable `AppContextMenu` and context-menu actions across list/kanban/calendar/timeline/dashboard/tree/people views
- Expanded global theming with 16 app themes and persisted theme selection in `AppContext`
- Enhanced quick actions (header dropdown, command palette, sub-project/sub-task/person modal flows)
- Renamed product branding and storage/export naming to Celestask (`celestask.db`, backup/export filenames)
- Added reusable logo component (`components/ui/Logo.tsx`) and wired branding in `Header`/`Sidebar`
- Added app icon at `app/icon.svg` using the same moon-over-sun identity

---

## 12. Import/Export Format

### Export Payload Structure
```typescript
{
  version: "1.6.0",
  exportedAt: "2026-02-20T...",
  data: {
    projects: Project[],
    people: Person[],
    tags: Tag[],
    tasks: Task[],
    task_assignees: TaskAssignee[],
    task_tags: TaskTag[],
    project_assignees: ProjectAssignee[],
    notes: Note[],
    custom_fields: CustomField[],
    custom_field_values: CustomFieldValue[],
    saved_views: SavedView[]
  }
}
```

### Import Modes
- `merge` (default): Update existing records by ID, insert new ones
- `replace`: Clear all tables first, then insert all records

### Table Import Order (respects foreign keys)
1. projects
2. people
3. tags
4. tasks
5. task_assignees
6. task_tags
7. project_assignees
8. notes
9. custom_fields
10. custom_field_values
11. saved_views
