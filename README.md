# 📋 TaskFlow - Project Management Application

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com)
[![Version](https://img.shields.io/badge/version-1.1.0-blue)](https://github.com)
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

### 👥 People & Assignments
- **People Management** - Create and manage contacts (not users) with name, email, company, and designation
- **Project Association** - Associate people with specific projects
- **Task Assignments** - Assign a primary assignee and multiple co-assignees (collaborators) to tasks
- **Assignment Roles** - Track collaborator roles on tasks

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
   - Shows assignees and tags on task cards

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
- **Assignee**: Primary assignee (person responsible)
- **Co-Assignees**: Multiple collaborators with roles
- **Tags**: Multiple tags for categorization

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

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0 or **yarn** >= 1.22.0

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

### 2. Install Dependencies

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
. .\scripts.ps1

# Then install all dependencies
Install-All
```

### 3. Start the Development Servers

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
. .\scripts.ps1

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
4. Click **"Create Project"**

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
4. Click **"Create Task"**

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
    "tagIds": ["tag-uuid-1", "tag-uuid-2"]
  }'
```

#### Example: Update Task Status
```bash
curl -X PATCH http://localhost:3001/api/tasks/task-uuid/status \
  -H "Content-Type: application/json" \
  -d '{"status": "in_progress"}'
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
| `created_at` | DATETIME | Creation timestamp |
| `updated_at` | DATETIME | Last update timestamp |

#### `tasks`
| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT | Primary key (UUID) |
| `project_id` | TEXT | Foreign key to projects |
| `title` | TEXT | Task title |
| `description` | TEXT | Task description |
| `status` | TEXT | Task status (backlog/todo/in_progress/review/done) |
| `priority` | TEXT | Priority (low/medium/high/urgent) |
| `start_date` | DATE | Task start date |
| `due_date` | DATE | Task due date |
| `assignee_id` | TEXT | Foreign key to people (primary assignee) |
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

### Seeded Data
On first run, the database is automatically seeded with:
- 3 sample projects
- 15+ sample tasks across various statuses
- Sample people contacts
- Sample tags

---

## 📁 Project Structure

```
task-tracking/
├── ARCHITECTURE.md          # Detailed architecture documentation
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
│       └── tags.js        # Tags API routes
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
        │   └── TagContext.tsx
        │
        └── components/
            ├── common/    # Reusable UI components
            │   ├── Badge.tsx
            │   ├── Button.tsx
            │   ├── Card.tsx
            │   ├── Modal.tsx
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

### 📝 List View
A traditional table-based view for detailed task management:
- Sortable columns (click headers to sort)
- Advanced filtering panel
- Filter by assignee and tags
- Full-text search
- Bulk task overview

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

### 📊 Dashboard
Project overview with statistics and visualizations:
- **Statistics Cards**: Total tasks, In Progress, Completed, Overdue
- **Task Distribution Chart**: Pie chart of tasks by status
- **Priority Breakdown**: Bar chart of priority distribution
- **Upcoming Deadlines**: List of tasks due soon

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
- [ ] **Task Dependencies** - Link tasks with dependencies
- [ ] **Subtasks** - Break down tasks into smaller items
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
