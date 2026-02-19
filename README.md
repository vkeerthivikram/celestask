# 📋 TaskFlow - Project Management Application

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com)
[![Version](https://img.shields.io/badge/version-1.6.0-blue)](https://github.com)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)

A **local-first, single-user** project management web application inspired by Jira. Built with modern technologies for a fast, responsive, and offline-capable experience.

## 📸 Screenshots

<!-- Add your screenshots here -->
| Kanban Board | List View |
|:------------:|:---------:|
| ![Kanban Board](screenshots/kanban.png) | ![List View](screenshots/list.png) |

| Calendar View | Timeline View |
|:-------------:|:-------------:|
| ![Calendar View](screenshots/calendar.png) | ![Timeline View](screenshots/timeline.png) |

| Dashboard | People View |
|:---------:|:-----------:|
| ![Dashboard](screenshots/dashboard.png) | ![People View](screenshots/people.png) |

---

## ✨ Features

### 🎯 Core Functionality
- **Project Management** - Create, edit, and delete projects with custom colors
- **Task Management** - Full CRUD operations for tasks with rich metadata
- **Drag & Drop** - Intuitive drag-and-drop in Kanban board using @dnd-kit
- **Local-First** - All data stored locally in SQLite, works offline
- **Responsive Design** - Works seamlessly on desktop and mobile devices

### 🌲 v1.2.0: Nested Hierarchy
- **Nested Projects** - Create infinitely nested sub-projects to organize complex work
- **Nested Tasks** - Break down tasks into sub-tasks to any depth
- **Project Tree View** - Visualize project hierarchy with expandable tree
- **Task Tree View** - Navigate task hierarchies with parent/child relationships
- **Move Operations** - Move projects and tasks between parents

### 📊 v1.2.0: Progress Tracking
- **Progress Percentage** - Track completion from 0-100% on any task
- **Time Estimates** - Set estimated duration in minutes for tasks
- **Actual Time Tracking** - Record actual time spent on tasks
- **Progress Rollup** - Parent tasks show aggregated progress from children
- **Visual Progress Bars** - See progress at a glance on task cards

### 📝 v1.2.0: Notes System
- **Markdown Notes** - Add rich-text notes with full markdown support
- **Entity Attachment** - Attach notes to projects, tasks, or people
- **Note History** - Track creation and update timestamps
- **Preview Mode** - Toggle between edit and preview modes

### 👥 People & Assignments
- **People Management** - Create and manage contacts (not users) with name, email, company, and designation
- **Project Association** - Associate people with specific projects
- **Task Assignments** - Assign a primary assignee and multiple co-assignees (collaborators) to tasks
- **Assignment Roles** - Track collaborator roles on tasks

### 🏢 v1.3.0: Project Assignments
- **Project Owner** - Set a primary owner for each project from the people list
- **Project Assignees** - Add multiple team members to projects with roles (lead, member, observer)
- **Owner Display** - Visual indicators show project owner in sidebar and project tree
- **Team Management** - View and manage project team membership

### 🔧 v1.6.0: Custom Fields & Saved Views
- **Custom Fields** - Define custom fields for tasks with 7 types: text, number, date, select, multiselect, checkbox, url
- **Project-Specific Fields** - Create fields that apply globally or to specific projects
- **Field Options** - Configure select and multiselect fields with predefined options
- **Required Fields** - Mark custom fields as required for task completion
- **Saved Views** - Save current filter configurations as named views
- **Default Views** - Set a saved view as the default for any view type
- **Quick Access** - Apply saved filters instantly from the dropdown

### 🏷️ Tags & Categorization
- **Custom Tags** - Create tags with custom names and colors
- **Tag Scope** - Tags can be global (available to all projects) or project-specific
- **Multiple Tags** - Apply multiple tags to any task for flexible categorization
- **Tag Filtering** - Filter tasks by tags in the list view

### 📊 Six Powerful Views

1. **📌 Kanban Board** - Visual task management with 5 status columns
   - Backlog → To Do → In Progress → Review → Done
   - Drag tasks between columns to update status
   - Color-coded priority badges
   - Shows assignees, tags, and progress on task cards

2. **📝 List View** - Traditional tabular view with advanced filtering
   - Sortable columns (title, status, priority, due date)
   - Filter by status, priority, project, assignee, and date range
   - Filter by tags
   - Search across task titles and descriptions

3. **📅 Calendar View** - Monthly calendar with due date visualization
   - See tasks plotted on their due dates
   - Navigate between months
   - Color-coded by priority

4. **📈 Timeline/Gantt View** - Horizontal timeline visualization
   - Visualize task durations from start to due date
   - Today marker for current date reference
   - Zoom between day/week/month views

5. **📊 Dashboard** - At-a-glance project overview
   - Statistics cards (total, completed, overdue, in-progress)
   - Task distribution pie chart by status
   - Priority breakdown visualization
   - Upcoming deadlines list

6. **👥 People View** - Contact and assignment management
   - View all contacts or filter by project
   - See contact details (email, company, designation)
   - Manage project-associated people

### 🏷️ Task Properties
- **Status**: Backlog, To Do, In Progress, Review, Done
- **Priority**: Low, Medium, High, Urgent
- **Dates**: Start date and due date
- **Project**: Belongs to a project
- **Parent Task**: Can be a sub-task of another task (v1.2.0)
- **Assignee**: Primary assignee (person responsible)
- **Co-Assignees**: Multiple collaborators with roles
- **Tags**: Multiple tags for categorization
- **Progress**: Completion percentage (v1.2.0)
- **Time Estimates**: Estimated and actual duration (v1.2.0)

### 🌲 Project Properties (v1.2.0)
- **Parent Project**: Can be a sub-project of another project
- **Nested Structure**: Organize projects in hierarchical trees

---

## 🛠️ Tech Stack

### Backend
| Technology | Purpose |
|------------|---------|
| [Node.js](https://nodejs.org/) | JavaScript runtime |
| [Express](https://expressjs.com/) | Web framework |
| [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) | SQLite database driver |
| [date-fns](https://date-fns.org/) | Date manipulation |

### Frontend
| Technology | Purpose |
|------------|---------|
| [React 18](https://react.dev/) | UI library |
| [TypeScript](https://www.typescriptlang.org/) | Type safety |
| [Vite](https://vitejs.dev/) | Build tool & dev server |
| [Tailwind CSS](https://tailwindcss.com/) | Styling framework |

### Key Libraries
| Library | Purpose |
|---------|---------|
| [@dnd-kit](https://dndkit.com/) | Drag and drop for Kanban |
| [recharts](https://recharts.org/) | Dashboard charts |
| [react-big-calendar](https://jquense.github.io/react-big-calendar/) | Calendar view |
| [lucide-react](https://lucide.dev/) | Icon library |
| [date-fns](https://date-fns.org/) | Date manipulation |
| [react-router-dom](https://reactrouter.com/) | Client-side routing |

---

## ⚙️ Prerequisites

- **Node.js** 22.x or 24.x
- **npm** >= 9.0.0 or **yarn** >= 1.22.0
- **nvm** (recommended for automatic per-project Node version)

Check your versions:
```bash
node --version
npm --version
```

---

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd task-tracking
```

### 2. Select Node Version (Recommended)

```bash
# Use project-pinned version from .nvmrc
nvm use || nvm install

# Verify
node --version
```

### 3. Install Dependencies

**Option A: Using npm (manual)**
```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

**Option B: Using Makefile (recommended)**
```bash
# Install all dependencies at once
make install
```

**Option C: Using PowerShell (Windows)**
```powershell
# First, load the scripts (dot-source)
.\scripts.ps1

# Then install all dependencies
Install-All
```

### 4. Start the Development Servers

**Option A: Using npm**
```bash
# Start the backend server (from server directory)
cd server
npm start
```
The backend server runs on **http://localhost:3001**

Open a new terminal:
```bash
# Start the frontend dev server (from client directory)
cd client
npm run dev
```
The frontend runs on **http://localhost:3000**

**Option B: Using Makefile**
```bash
# Start both servers with a single command
make dev
```

**Option C: Using PowerShell (Windows)**
```powershell
# First, load the scripts (dot-source)
.\scripts.ps1

# Start both servers
Start-Dev

# Or start individually:
Start-Server   # Backend only (port 3001)
Start-Client   # Frontend only (port 3000)
```

### 4. Access the Application
Open your browser and navigate to: **http://localhost:3000**

> **Note**: The database is automatically created and seeded with sample data on first run.

---

## ⚡ Quick Commands (Makefile)

This project includes a Makefile for common development tasks. Run `make` or `make help` to see all available commands.

### Root Makefile Commands

| Command | Description |
|---------|-------------|
| `make install` | Install all dependencies (root + server + client) |
| `make dev` | Start both frontend and backend servers |
| `make server` | Start backend server only (port 3001) |
| `make client` | Start frontend dev server only (port 3000) |
| `make build` | Build frontend for production |
| `make clean` | Remove all node_modules directories |
| `make reinstall` | Clean and reinstall everything |
| `make db-reset` | Delete SQLite database and reseed fresh data |
| `make help` | Display available commands (default) |

### Server Makefile Commands

The server directory has its own Makefile for backend-specific tasks:

| Command | Description |
|---------|-------------|
| `cd server; make start` | Start the backend server |
| `cd server; make seed` | Reseed the database with sample data |
| `cd server; make clean` | Remove server node_modules |
| `cd server; make help` | Display available server commands |

---

## 💻 Quick Commands (PowerShell)

For Windows users who don't have `make` installed, PowerShell scripts are provided as an alternative. The project includes [`scripts.ps1`](scripts.ps1) at the root and [`server/scripts.ps1`](server/scripts.ps1) for backend-specific tasks.

### How to Use PowerShell Scripts

**Important**: PowerShell scripts must be dot-sourced (loaded) before you can call their functions:

```powershell
# From the project root, load the scripts:
. .\scripts.ps1

# Now you can call any function:
Show-Help           # Display all available commands
```

### Root PowerShell Commands

| Function | Description |
|----------|-------------|
| `Install-All` | Install all dependencies (root + server + client) |
| `Start-Dev` | Start both frontend and backend servers |
| `Start-Server` | Start backend server only (port 3001) |
| `Start-Client` | Start frontend dev server only (port 3000) |
| `Build-Production` | Build frontend for production |
| `Clean-All` | Remove all node_modules directories |
| `Reinstall-All` | Clean and reinstall everything |
| `Reset-Database` | Delete SQLite database and reseed fresh data |
| `Show-Help` | Display available commands |

### Server PowerShell Commands

The server directory has its own [`scripts.ps1`](server/scripts.ps1) for backend-specific tasks:

```powershell
# Navigate to server directory and load scripts
cd server
. .\scripts.ps1
```

| Function | Description |
|----------|-------------|
| `Start-Server` | Start the backend server |
| `Seed-Database` | Reseed the database with sample data |
| `Clean-Server` | Remove server node_modules |
| `Show-Help` | Display available server commands |

### Quick Start Examples

```powershell
# Load scripts (do this first!)
. .\scripts.ps1

# Quick start - install and run
Install-All
Start-Dev

# Reset database to fresh state
Reset-Database

# Clean reinstall after dependency changes
Reinstall-All
```

> **Note**: If you get an execution policy error, run this command first:
> ```powershell
> Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
> ```

---

## 📖 Usage

### Creating a Project
1. Click the **"+ New Project"** button in the sidebar or header
2. Enter a project name and optional description
3. Choose a color for visual identification
4. Optionally select a parent project to create a sub-project (v1.2.0)
5. Click **"Create Project"**

### Creating Nested Sub-Projects (v1.2.0)
1. Navigate to an existing project
2. Click **"Add Sub-Project"** in the project menu
3. The new project will be nested under the parent
4. Use the tree view to visualize hierarchy

### Creating a Task
1. Select a project from the dropdown
2. Click **"+ New Task"** button
3. Fill in task details:
   - **Title** (required)
   - **Description** (optional)
   - **Status** (defaults to "To Do")
   - **Priority** (Low, Medium, High, Urgent)
   - **Start Date** (optional)
   - **Due Date** (optional)
   - **Assignee** (primary person responsible)
   - **Tags** (select multiple tags)
   - **Progress** (0-100%, v1.2.0)
   - **Estimated Duration** (v1.2.0)
4. Click **"Create Task"**

### Creating Sub-Tasks (v1.2.0)
1. Open an existing task
2. Click **"Add Sub-Task"** in the task menu
3. The sub-task inherits the parent's project
4. View hierarchy in the task tree

### Tracking Progress (v1.2.0)
1. Open a task for editing
2. Use the **Progress slider** to set completion percentage (0-100%)
3. Enter **Estimated Duration** in hours/minutes (e.g., "2h 30m")
4. Enter **Actual Duration** when work is complete
5. For parent tasks, view **rollup progress** from all children

### Adding Notes (v1.2.0)
1. Open any project, task, or person
2. Navigate to the **Notes** panel
3. Click **"Add Note"**
4. Write your note using markdown syntax:
   - Headers: `#`, `##`, `###`
   - Bold: `**text**`
   - Italic: `*text*`
   - Lists: `- item` or `1. item`
   - Code: `` `code` `` or ` ```block``` `
5. Click **"Save Note"**

### Managing People
1. Navigate to the **People** view from the sidebar
2. Click **"+ New Person"** to add a contact
3. Fill in person details:
   - **Name** (required)
   - **Email** (optional)
   - **Company** (optional)
   - **Designation** (optional)
   - **Project** (associate with a project, or leave blank for global)
4. Click **"Create Person"**

### Assigning People to Tasks
1. Open a task for editing (click on the task card)
2. In the **Assignee** dropdown, select the primary assignee
3. To add co-assignees (collaborators):
   - Click **"Add Collaborator"**
   - Select a person and optionally specify their role
4. Click **"Save Changes"**

### Assigning Owner to Projects (v1.3.0)
1. Open the project form (click **"Edit"** on a project or create a new one)
2. In the **Owner** dropdown, select a person from your contacts
3. The owner's avatar will appear next to the project name in the sidebar
4. Click **"Save"** to assign the owner

### Managing Project Team Members (v1.3.0)
1. Navigate to a project
2. View the project team in the sidebar or project details
3. Add team members with specific roles:
   - **Lead**: Project lead with primary responsibility
   - **Member**: Regular team member
   - **Observer**: Read-only access to project progress
4. Each project can have multiple assignees with different roles

### Creating Custom Fields (v1.6.0)
1. Navigate to a project or use global custom fields
2. Click **"Manage Custom Fields"** in the project settings
3. Click **"+ New Field"** to create a custom field
4. Configure the field:
   - **Name**: Field display name (e.g., "Story Points", "Sprint", "Epic Link")
   - **Type**: Choose from 7 types:
     - **Text**: Single-line text input
     - **Number**: Numeric value
     - **Date**: Date picker
     - **Select**: Single selection dropdown
     - **Multi-Select**: Multiple selection dropdown
     - **Checkbox**: Boolean toggle
     - **URL**: URL/link field
   - **Options**: For select/multi-select, define available options
   - **Required**: Mark as required for task completion
   - **Project Scope**: Leave empty for global, or select a project
5. Click **"Create Field"**
6. Custom fields appear automatically in task forms for applicable projects

### Using Custom Fields in Tasks (v1.6.0)
1. Open a task for editing
2. Scroll to the **Custom Fields** section
3. Fill in values for available custom fields:
   - Text fields: Type directly
   - Number fields: Enter numeric values
   - Date fields: Use the date picker
   - Select fields: Choose one option
   - Multi-Select fields: Choose multiple options
   - Checkbox fields: Toggle on/off
   - URL fields: Enter complete URLs
4. Required fields must be filled before task can be marked complete
5. Click **"Save Changes"** to store custom field values

### Saving Filter Views (v1.6.0)
1. In List, Kanban, Calendar, or Timeline view, apply your desired filters
2. Configure:
   - Status filters
   - Priority filters
   - Assignee filters
   - Tag filters
   - Date range filters
   - Sort order
3. Click the **"Save View"** button in the filter bar
4. In the save modal:
   - Enter a **View Name** (e.g., "My High Priority Tasks", "Sprint 1 Items")
   - Optionally check **"Set as default"** to auto-load this view
5. Click **"Save"** to store the view configuration

### Applying Saved Views (v1.6.0)
1. Click the **Views dropdown** in the filter bar
2. Select a saved view from the list
3. All filters and sort settings are applied instantly
4. The default view loads automatically when you open that view type
5. To manage saved views:
   - Click the **Views dropdown** 
   - Hover over a saved view to see edit/delete options
   - Update view name or set as default
   - Delete unused views

### Creating and Using Tags
1. Tags can be created when editing a task:
   - Click in the **Tags** field
   - Select existing tags or type to create a new one
2. When creating a new tag:
   - Enter a tag name
   - Choose a color
   - Select if it's global or project-specific
3. Tags appear as colored badges on task cards
4. Filter tasks by tags in the List View

### Editing/Deleting Tasks
- **Edit**: Click on a task card to open the edit modal
- **Delete**: Click the trash icon on the task card or in the edit modal

### Switching Between Views
Use the sidebar navigation to switch between:
- 📌 Kanban
- 📝 List
- 📅 Calendar
- 📈 Timeline
- 📊 Dashboard
- 👥 People

### Using Drag-and-Drop in Kanban
1. Click and hold a task card
2. Drag it to the desired status column
3. Release to update the task status

### Filtering in List View
1. Use the filter bar at the top
2. Filter by:
   - **Status**: Select one or more statuses
   - **Priority**: Select priority level
   - **Assignee**: Select person assigned to task
   - **Tags**: Select one or more tags
   - **Search**: Type to search task titles
3. Click **"Clear Filters"** to reset

---

## 🔌 API Endpoints

### Base URL
```
http://localhost:3001/api
```

### Projects API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/projects` | Get all projects |
| `GET` | `/projects/:id` | Get single project by ID |
| `POST` | `/projects` | Create a new project |
| `PUT` | `/projects/:id` | Update a project |
| `DELETE` | `/projects/:id` | Delete a project |

#### Example: Create Project
```bash
curl -X POST http://localhost:3001/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "My Project", "description": "Project description", "color": "#3B82F6"}'
```

### Project Hierarchy API (v1.2.0)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/projects/root` | Get all root projects (no parent) |
| `GET` | `/projects/:id/children` | Get direct child projects |
| `GET` | `/projects/:id/descendants` | Get all descendants recursively |
| `GET` | `/projects/:id/ancestors` | Get path to root (all ancestors) |
| `GET` | `/projects/:id/tree` | Get project with nested children |
| `POST` | `/projects/:parentId/subprojects` | Create a sub-project |
| `PUT` | `/projects/:id/move` | Move to new parent (or root) |

#### Example: Create Sub-Project
```bash
curl -X POST http://localhost:3001/api/projects/parent-id/subprojects \
  -H "Content-Type: application/json" \
  -d '{"name": "Sub-Project", "description": "Nested project"}'
```

#### Example: Move Project
```bash
curl -X PUT http://localhost:3001/api/projects/project-id/move \
  -H "Content-Type: application/json" \
  -d '{"parent_project_id": "new-parent-id"}'
```

### Tasks API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/tasks` | Get all tasks (supports query filters) |
| `GET` | `/tasks/:id` | Get single task by ID |
| `POST` | `/tasks` | Create a new task |
| `PUT` | `/tasks/:id` | Update a task |
| `PATCH` | `/tasks/:id/status` | Update task status only |
| `DELETE` | `/tasks/:id` | Delete a task |

#### Query Parameters for GET /tasks
| Parameter | Type | Description |
|-----------|------|-------------|
| `projectId` | string | Filter by project ID |
| `status` | string | Filter by status |
| `priority` | string | Filter by priority |
| `assigneeId` | string | Filter by assignee ID |
| `tagId` | string | Filter by tag ID |

#### Example: Create Task
```bash
curl -X POST http://localhost:3001/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "project-uuid",
    "title": "New Task",
    "description": "Task description",
    "status": "todo",
    "priority": "high",
    "dueDate": "2024-02-28",
    "assigneeId": "person-uuid",
    "tagIds": ["tag-uuid-1", "tag-uuid-2"],
    "progress_percent": 25,
    "estimated_duration_minutes": 120
  }'
```

#### Example: Update Task Status
```bash
curl -X PATCH http://localhost:3001/api/tasks/task-uuid/status \
  -H "Content-Type: application/json" \
  -d '{"status": "in_progress"}'
```

### Task Hierarchy API (v1.2.0)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/tasks/:id/children` | Get direct child tasks |
| `GET` | `/tasks/:id/descendants` | Get all descendants recursively |
| `GET` | `/tasks/:id/ancestors` | Get path to root task |
| `GET` | `/tasks/:id/tree` | Get task with nested children |
| `POST` | `/tasks/:parentId/subtasks` | Create a sub-task |
| `PUT` | `/tasks/:id/move` | Move to new parent (or root) |
| `GET` | `/projects/:id/tasks/root` | Get root tasks for project |

#### Example: Create Sub-Task
```bash
curl -X POST http://localhost:3001/api/tasks/parent-id/subtasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Sub-Task", "priority": "medium"}'
```

### Task Progress API (v1.2.0)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `PUT` | `/tasks/:id/progress` | Update progress and duration |
| `GET` | `/tasks/:id/progress/rollup` | Get calculated progress including children |

#### Example: Update Progress
```bash
curl -X PUT http://localhost:3001/api/tasks/task-uuid/progress \
  -H "Content-Type: application/json" \
  -d '{
    "progress_percent": 75,
    "actual_duration_minutes": 90
  }'
```

#### Example: Get Progress Rollup
```bash
curl http://localhost:3001/api/tasks/task-uuid/progress/rollup
```

Response:
```json
{
  "success": true,
  "data": {
    "task_id": "task-uuid",
    "direct_progress": 50,
    "rollup_progress": 67,
    "child_count": 4,
    "completed_children": 2
  }
}
```

### Notes API (v1.2.0)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/notes` | List notes (query: `entity_type`, `entity_id`) |
| `GET` | `/notes/:id` | Get single note |
| `POST` | `/notes` | Create note |
| `PUT` | `/notes/:id` | Update note |
| `DELETE` | `/notes/:id` | Delete note |

#### Example: Create Note
```bash
curl -X POST http://localhost:3001/api/notes \
  -H "Content-Type: application/json" \
  -d '{
    "content": "# Important Note\n\nThis task requires **urgent** attention.",
    "entity_type": "task",
    "entity_id": "task-uuid"
  }'
```

#### Example: Get Notes for a Task
```bash
curl "http://localhost:3001/api/notes?entity_type=task&entity_id=task-uuid"
```

### People API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/people` | Get all people (optional `?project_id=xxx`) |
| `GET` | `/people/:id` | Get single person by ID |
| `POST` | `/people` | Create a new person |
| `PUT` | `/people/:id` | Update a person |
| `DELETE` | `/people/:id` | Delete a person |

#### Example: Create Person
```bash
curl -X POST http://localhost:3001/api/people \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "company": "Acme Inc",
    "designation": "Developer",
    "project_id": "project-uuid"
  }'
```

### Tags API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/tags` | Get all tags (optional `?project_id=xxx`) |
| `GET` | `/tags/:id` | Get single tag by ID |
| `POST` | `/tags` | Create a new tag |
| `PUT` | `/tags/:id` | Update a tag |
| `DELETE` | `/tags/:id` | Delete a tag |

#### Example: Create Tag
```bash
curl -X POST http://localhost:3001/api/tags \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bug",
    "color": "#EF4444",
    "project_id": "project-uuid"
  }'
```

### Task Assignments API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/tasks/:id/assignees` | Get co-assignees for a task |
| `POST` | `/tasks/:id/assignees` | Add a co-assignee to a task |
| `DELETE` | `/tasks/:id/assignees/:personId` | Remove a co-assignee from a task |
| `PUT` | `/tasks/:id/assignee` | Set the primary assignee |

#### Example: Add Co-Assignee
```bash
curl -X POST http://localhost:3001/api/tasks/task-uuid/assignees \
  -H "Content-Type: application/json" \
  -d '{
    "person_id": "person-uuid",
    "role": "Reviewer"
  }'
```

#### Example: Set Primary Assignee
```bash
curl -X PUT http://localhost:3001/api/tasks/task-uuid/assignee \
  -H "Content-Type: application/json" \
  -d '{"assignee_id": "person-uuid"}'
```

### Project Assignments API (v1.3.0)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `PUT` | `/projects/:id/owner` | Set project owner (body: `{ personId: string \| null }`) |
| `GET` | `/projects/:id/assignees` | Get all project assignees |
| `POST` | `/projects/:id/assignees` | Add assignee to project (body: `{ personId: string, role?: string }`) |
| `DELETE` | `/projects/:id/assignees/:assigneeId` | Remove assignee from project |

#### Example: Set Project Owner
```bash
curl -X PUT http://localhost:3001/api/projects/project-uuid/owner \
  -H "Content-Type: application/json" \
  -d '{"personId": "person-uuid"}'
```

#### Example: Add Project Assignee
```bash
curl -X POST http://localhost:3001/api/projects/project-uuid/assignees \
  -H "Content-Type: application/json" \
  -d '{
    "personId": "person-uuid",
    "role": "lead"
  }'
```

#### Example: Get Project Assignees
```bash
curl http://localhost:3001/api/projects/project-uuid/assignees
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "assignee-uuid",
      "project_id": "project-uuid",
      "person_id": "person-uuid",
      "role": "lead",
      "person": {
        "id": "person-uuid",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "created_at": "2026-02-18T10:00:00Z"
    }
  ]
}
```

### Task Tags API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/tasks/:id/tags` | Get tags for a task |
| `POST` | `/tasks/:id/tags` | Add a tag to a task |
| `DELETE` | `/tasks/:id/tags/:tagId` | Remove a tag from a task |

#### Example: Add Tag to Task
```bash
curl -X POST http://localhost:3001/api/tasks/task-uuid/tags \
  -H "Content-Type: application/json" \
  -d '{"tag_id": "tag-uuid"}'
```

### Custom Fields API (v1.6.0)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/custom-fields` | Get all custom fields (optional `?project_id=xxx`) |
| `GET` | `/custom-fields/:id` | Get single custom field |
| `POST` | `/custom-fields` | Create a new custom field |
| `PUT` | `/custom-fields/:id` | Update a custom field |
| `DELETE` | `/custom-fields/:id` | Delete a custom field |
| `GET` | `/tasks/:id/custom-fields` | Get custom field values for a task |
| `PUT` | `/tasks/:id/custom-fields/:fieldId` | Set custom field value on a task |
| `DELETE` | `/tasks/:id/custom-fields/:fieldId` | Remove custom field value from a task |

#### Example: Create Custom Field
```bash
curl -X POST http://localhost:3001/api/custom-fields \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Story Points",
    "field_type": "number",
    "project_id": "project-uuid",
    "required": false
  }'
```

#### Example: Create Select Field with Options
```bash
curl -X POST http://localhost:3001/api/custom-fields \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Priority Level",
    "field_type": "select",
    "project_id": "project-uuid",
    "options": ["Critical", "High", "Medium", "Low"],
    "required": true
  }'
```

#### Example: Set Custom Field Value on Task
```bash
curl -X PUT http://localhost:3001/api/tasks/task-uuid/custom-fields/field-uuid \
  -H "Content-Type: application/json" \
  -d '{"value": "8"}'
```

#### Example: Get Task Custom Field Values
```bash
curl http://localhost:3001/api/tasks/task-uuid/custom-fields
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "value-uuid",
      "task_id": "task-uuid",
      "custom_field_id": "field-uuid",
      "value": "8",
      "custom_field": {
        "id": "field-uuid",
        "name": "Story Points",
        "field_type": "number",
        "required": false
      },
      "created_at": "2026-02-19T10:00:00Z",
      "updated_at": "2026-02-19T10:00:00Z"
    }
  ]
}
```

### Saved Views API (v1.6.0)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/saved-views` | Get all saved views (optional `?view_type=xxx&project_id=xxx`) |
| `GET` | `/saved-views/:id` | Get single saved view |
| `POST` | `/saved-views` | Create a new saved view |
| `PUT` | `/saved-views/:id` | Update a saved view |
| `DELETE` | `/saved-views/:id` | Delete a saved view |
| `PUT` | `/saved-views/:id/set-default` | Set view as default for its type |

#### Example: Create Saved View
```bash
curl -X POST http://localhost:3001/api/saved-views \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My High Priority Tasks",
    "view_type": "list",
    "project_id": "project-uuid",
    "filters": {
      "priority": ["high", "urgent"],
      "status": ["todo", "in_progress"]
    },
    "sort_by": "due_date",
    "sort_order": "asc",
    "is_default": false
  }'
```

#### Example: Set View as Default
```bash
curl -X PUT http://localhost:3001/api/saved-views/view-uuid/set-default
```

#### Example: Get Saved Views for List View
```bash
curl "http://localhost:3001/api/saved-views?view_type=list"
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "view-uuid",
      "name": "My High Priority Tasks",
      "view_type": "list",
      "project_id": "project-uuid",
      "filters": {
        "priority": ["high", "urgent"],
        "status": ["todo", "in_progress"]
      },
      "sort_by": "due_date",
      "sort_order": "asc",
      "is_default": true,
      "created_at": "2026-02-19T10:00:00Z",
      "updated_at": "2026-02-19T10:00:00Z"
    }
  ]
}
```

### Response Format

**Success Response:**
```json
{
  "success": true,
  "data": { /* resource data */ }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description"
  }
}
```

---

## 🗄️ Database

### Storage Location
The SQLite database is stored at:
```
server/data/taskmanager.db
```

### Tables

#### `projects`
| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT | Primary key (UUID) |
| `name` | TEXT | Project name |
| `description` | TEXT | Project description |
| `color` | TEXT | Hex color code |
| `parent_project_id` | TEXT | Foreign key to parent project (v1.2.0) |
| `owner_id` | TEXT | Foreign key to people - project owner (v1.3.0) |
| `created_at` | DATETIME | Creation timestamp |
| `updated_at` | DATETIME | Last update timestamp |

#### `tasks`
| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT | Primary key (UUID) |
| `project_id` | TEXT | Foreign key to projects |
| `parent_task_id` | TEXT | Foreign key to parent task (v1.2.0) |
| `title` | TEXT | Task title |
| `description` | TEXT | Task description |
| `status` | TEXT | Task status (backlog/todo/in_progress/review/done) |
| `priority` | TEXT | Priority (low/medium/high/urgent) |
| `start_date` | DATE | Task start date |
| `due_date` | DATE | Task due date |
| `assignee_id` | TEXT | Foreign key to people (primary assignee) |
| `progress_percent` | INTEGER | Completion percentage 0-100 (v1.2.0) |
| `estimated_duration_minutes` | INTEGER | Estimated time (v1.2.0) |
| `actual_duration_minutes` | INTEGER | Actual time spent (v1.2.0) |
| `created_at` | DATETIME | Creation timestamp |
| `updated_at` | DATETIME | Last update timestamp |

#### `notes` (v1.2.0)
| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT | Primary key (UUID) |
| `content` | TEXT | Markdown note content |
| `entity_type` | TEXT | Type: 'project', 'task', or 'person' |
| `entity_id` | TEXT | ID of the related entity |
| `created_by` | TEXT | Foreign key to people (optional) |
| `created_at` | DATETIME | Creation timestamp |
| `updated_at` | DATETIME | Last update timestamp |

#### `people`
| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT | Primary key (UUID) |
| `name` | TEXT | Person's name |
| `email` | TEXT | Email address |
| `company` | TEXT | Company name |
| `designation` | TEXT | Job title/role |
| `project_id` | TEXT | Foreign key to projects (optional) |
| `created_at` | DATETIME | Creation timestamp |
| `updated_at` | DATETIME | Last update timestamp |

#### `tags`
| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT | Primary key (UUID) |
| `name` | TEXT | Tag name |
| `color` | TEXT | Hex color code (default: #6B7280) |
| `project_id` | TEXT | Foreign key to projects (null = global) |
| `created_at` | DATETIME | Creation timestamp |
| `updated_at` | DATETIME | Last update timestamp |

#### `task_assignees`
| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT | Primary key (UUID) |
| `task_id` | TEXT | Foreign key to tasks (CASCADE DELETE) |
| `person_id` | TEXT | Foreign key to people (CASCADE DELETE) |
| `role` | TEXT | Role on this task (default: 'collaborator') |
| `created_at` | DATETIME | Creation timestamp |

#### `task_tags`
| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT | Primary key (UUID) |
| `task_id` | TEXT | Foreign key to tasks (CASCADE DELETE) |
| `tag_id` | TEXT | Foreign key to tags (CASCADE DELETE) |
| `created_at` | DATETIME | Creation timestamp |

#### `project_assignees` (v1.3.0)
| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT | Primary key (UUID) |
| `project_id` | TEXT | Foreign key to projects (CASCADE DELETE) |
| `person_id` | TEXT | Foreign key to people (CASCADE DELETE) |
| `role` | TEXT | Role: 'lead', 'member', or 'observer' |
| `created_at` | DATETIME | Creation timestamp |

#### `custom_fields` (v1.6.0)
| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT | Primary key (UUID) |
| `name` | TEXT | Field display name |
| `field_type` | TEXT | Type: 'text', 'number', 'date', 'select', 'multiselect', 'checkbox', 'url' |
| `project_id` | TEXT | Foreign key to projects (null = global) |
| `options` | TEXT | JSON array of options for select/multiselect types |
| `required` | INTEGER | Whether field is required (0 or 1) |
| `sort_order` | INTEGER | Display order |
| `created_at` | DATETIME | Creation timestamp |
| `updated_at` | DATETIME | Last update timestamp |

#### `custom_field_values` (v1.6.0)
| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT | Primary key (UUID) |
| `task_id` | TEXT | Foreign key to tasks (CASCADE DELETE) |
| `custom_field_id` | TEXT | Foreign key to custom_fields |
| `value` | TEXT | Stored value (JSON for multiselect) |
| `created_at` | DATETIME | Creation timestamp |
| `updated_at` | DATETIME | Last update timestamp |

#### `saved_views` (v1.6.0)
| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT | Primary key (UUID) |
| `name` | TEXT | View display name |
| `view_type` | TEXT | Type: 'list', 'kanban', 'calendar', or 'timeline' |
| `project_id` | TEXT | Foreign key to projects (null = all projects) |
| `filters` | TEXT | JSON object of filter configuration |
| `sort_by` | TEXT | Sort column name |
| `sort_order` | TEXT | 'asc' or 'desc' |
| `is_default` | INTEGER | Whether this is the default view (0 or 1) |
| `created_at` | DATETIME | Creation timestamp |
| `updated_at` | DATETIME | Last update timestamp |

### Seeded Data
On first run, the database is automatically seeded with:
- 3 sample projects (with nested sub-projects in v1.2.0)
- 15+ sample tasks across various statuses (with sub-tasks in v1.2.0)
- Sample people contacts
- Sample tags
- Sample notes (v1.2.0)

---

## 📁 Project Structure

```
task-tracking/
├── ARCHITECTURE.md          # Detailed architecture documentation
├── AGENTS.md                # AI agent workflow documentation
├── README.md               # This file
│
├── server/                 # Backend Express application
│   ├── package.json
│   ├── index.js           # Server entry point
│   ├── data/              # SQLite database storage
│   │   └── taskmanager.db
│   ├── db/
│   │   ├── database.js    # SQLite connection
│   │   ├── schema.js      # Table definitions
│   │   └── seed.js        # Sample data seeder
│   └── routes/
│       ├── projects.js    # Project API routes
│       ├── tasks.js       # Task API routes
│       ├── people.js      # People API routes
│       ├── tags.js        # Tags API routes
│       └── notes.js       # Notes API routes (v1.2.0)
│
└── client/                # Frontend React application
    ├── package.json
    ├── vite.config.ts     # Vite configuration
    ├── tailwind.config.js # Tailwind CSS configuration
    ├── index.html
    └── src/
        ├── main.tsx       # Application entry point
        ├── App.tsx        # Root component with routing
        ├── index.css      # Global styles & Tailwind
        │
        ├── types/         # TypeScript type definitions
        │   └── index.ts
        │
        ├── services/      # API service layer
        │   └── api.ts
        │
        ├── context/       # React Context providers
        │   ├── AppContext.tsx
        │   ├── ProjectContext.tsx
        │   ├── TaskContext.tsx
        │   ├── PeopleContext.tsx
        │   ├── TagContext.tsx
        │   └── NoteContext.tsx      # v1.2.0
        │
        └── components/
            ├── common/    # Reusable UI components
            │   ├── Badge.tsx
            │   ├── Button.tsx
            │   ├── Card.tsx
            │   ├── Modal.tsx
            │   ├── ProgressBar.tsx        # v1.2.0
            │   ├── TreeView.tsx           # v1.2.0
            │   ├── ProjectTreeNode.tsx    # v1.2.0
            │   ├── TaskTreeNode.tsx       # v1.2.0
            │   ├── TaskProgressIndicator.tsx  # v1.2.0
            │   ├── NoteCard.tsx           # v1.2.0
            │   ├── NoteEditor.tsx         # v1.2.0
            │   ├── NotesPanel.tsx         # v1.2.0
            │   ├── ProjectForm.tsx
            │   ├── TaskForm.tsx
            │   ├── PersonForm.tsx
            │   └── TagForm.tsx
            │
            ├── layout/    # Layout components
            │   ├── Header.tsx
            │   ├── Layout.tsx
            │   └── Sidebar.tsx
            │
            ├── kanban/    # Kanban board components
            │   ├── KanbanBoard.tsx
            │   ├── KanbanColumn.tsx
            │   └── TaskCard.tsx
            │
            ├── list/      # List view components
            │   ├── FilterBar.tsx
            │   ├── ListView.tsx
            │   ├── SortHeader.tsx
            │   ├── TaskListItem.tsx
            │   ├── TaskRow.tsx
            │   └── TaskRow.tsx
            │
            ├── calendar/  # Calendar view components
            │   ├── CalendarView.tsx
            │   └── TaskEvent.tsx
            │
            ├── timeline/  # Timeline/Gantt components
            │   ├── TimelineView.tsx
            │   └── TimelineTask.tsx
            │
            ├── dashboard/ # Dashboard components
            │   ├── DashboardView.tsx
            │   ├── StatCard.tsx
            │   └── UpcomingDeadlines.tsx
            │
            └── people/    # People view components
                └── PeopleView.tsx
```

---

## 🎨 Views Overview

### 📌 Kanban Board
A visual task management board with 5 columns representing task statuses:
- **Backlog** - Tasks not yet scheduled
- **To Do** - Tasks ready to be started
- **In Progress** - Tasks currently being worked on
- **Review** - Tasks awaiting review
- **Done** - Completed tasks

Features:
- Drag-and-drop tasks between columns
- Task count per column
- Priority badges with color coding
- Due date display
- Assignee and tag display
- Progress bars (v1.2.0)

### 📝 List View
A traditional table-based view for detailed task management:
- Sortable columns (click headers to sort)
- Advanced filtering panel
- Filter by assignee and tags
- Full-text search
- Bulk task overview
- Progress column (v1.2.0)

### 📅 Calendar View
Monthly calendar showing tasks by due date:
- Navigate between months
- Today highlighting
- Task color coding by priority
- Click tasks to edit

### 📈 Timeline View
Gantt-style visualization of task durations:
- Horizontal timeline spanning task date ranges
- Today marker (vertical line)
- Visual duration bars
- Scrollable timeline
- Nested task visualization (v1.2.0)

### 📊 Dashboard
Project overview with statistics and visualizations:
- **Statistics Cards**: Total tasks, In Progress, Completed, Overdue
- **Task Distribution Chart**: Pie chart of tasks by status
- **Priority Breakdown**: Bar chart of priority distribution
- **Upcoming Deadlines**: List of tasks due soon
- **Progress Overview**: Average completion percentage (v1.2.0)

### 👥 People View
Contact management and team overview:
- View all contacts in a card layout
- Filter people by project
- Contact details (email, company, designation)
- Project association display
- Quick actions to edit or delete contacts

---

## 🔮 Future Enhancements

Potential improvements for future development:

- [x] ~~**Labels/Tags** - Custom categorization system~~ ✅ Implemented
- [x] ~~**Subtasks** - Break down tasks into smaller items~~ ✅ Implemented v1.2.0
- [ ] **Task Dependencies** - Link tasks with dependencies
- [ ] **Time Tracking** - Log time spent on tasks
- [ ] **Export/Import** - Export data to JSON/CSV
- [ ] **Keyboard Shortcuts** - Power user navigation
- [ ] **Dark Mode** - Alternative theme option
- [ ] **Recurring Tasks** - Automatically recreate tasks
- [ ] **Attachments** - File attachments for tasks
- [ ] **Comments** - Add comments to tasks
- [ ] **Activity Log** - Track all changes
- [ ] **Notifications** - Deadline reminders
- [ ] **Multi-user Support** - Team collaboration

---

## 📄 License

This project is licensed under the **MIT License**.

```
MIT License

Copyright (c) 2024 TaskFlow

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📞 Support

If you encounter any issues or have questions, please open an issue on the repository.

---

<p align="center">
  Built with ❤️ using React, TypeScript, and Express
</p>
