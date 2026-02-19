import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { ProjectProvider, useProjects } from './context/ProjectContext';
import { TaskProvider } from './context/TaskContext';
import { PeopleProvider } from './context/PeopleContext';
import { TagProvider } from './context/TagContext';
import { NoteProvider } from './context/NoteContext';
import { ShortcutProvider } from './context/ShortcutContext';
import { ToastProvider } from './context/ToastContext';
import { CommandPaletteProvider } from './context/CommandPaletteContext';
import { CustomFieldProvider } from './context/CustomFieldContext';
import { SavedViewProvider } from './context/SavedViewContext';
import { Layout } from './components/layout/Layout';
import { KanbanBoard } from './components/kanban/KanbanBoard';
import { ListView } from './components/list/ListView';
import { CalendarView } from './components/calendar/CalendarView';
import { TimelineView } from './components/timeline/TimelineView';
import { DashboardView } from './components/dashboard/DashboardView';
import { PeopleView } from './components/people/PeopleView';
import { ToastContainer } from './components/common/ToastContainer';
import { ShortcutHelp } from './components/common/ShortcutHelp';
import { CommandPalette } from './components/common/CommandPalette';
import type { ViewType } from './types';

// TaskProviderWrapper - provides TaskProvider at Layout level so Layout can use useTasks()
const TaskProviderWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentProject } = useProjects();
  return (
    <TaskProvider projectId={currentProject?.id}>
      {children}
    </TaskProvider>
  );
};

// Placeholder view components - these will be implemented in future tasks
const PlaceholderView: React.FC<{ view: ViewType }> = ({ view }) => {
  const { currentProject } = useProjects();
  
  const viewLabels: Record<ViewType, string> = {
    kanban: 'Kanban Board',
    list: 'List View',
    calendar: 'Calendar View',
    timeline: 'Timeline View',
    dashboard: 'Dashboard',
    people: 'People',
  };
  
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
      <div className="max-w-md p-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {viewLabels[view]}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {currentProject 
            ? `Viewing tasks for "${currentProject.name}"`
            : 'Select a project to get started'}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500">
          This view component will be implemented in a future task.
        </p>
      </div>
    </div>
  );
};

// Kanban View - Now uses actual KanbanBoard component
const KanbanView: React.FC = () => <KanbanBoard />;

// List View - Now uses actual ListView component
const ListViewComponent: React.FC = () => <ListView />;

// Calendar View - Now uses actual CalendarView component
const CalendarViewComponent: React.FC = () => <CalendarView />;

// Timeline View - Now uses actual TimelineView component
const TimelineViewComponent: React.FC = () => <TimelineView />;

// Dashboard View - Now uses actual DashboardView component
const DashboardViewComponent: React.FC = () => <DashboardView />;

// Project View Wrapper - handles setting up context based on URL
const ProjectViewWrapper: React.FC<{ view: ViewType }> = ({ view }) => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { projects, loading, currentProject, setCurrentProjectById } = useProjects();
  const { setCurrentView, setCurrentProjectId } = useApp();
  
  // Set current view
  useEffect(() => {
    setCurrentView(view);
  }, [view, setCurrentView]);
  
  // Set current project from URL
  useEffect(() => {
    if (projectId) {
      const id = parseInt(projectId, 10);
      if (!isNaN(id)) {
        setCurrentProjectId(id);
        setCurrentProjectById(id);
      }
    }
  }, [projectId, setCurrentProjectId, setCurrentProjectById]);
  
  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }
  
  // No projects yet
  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
        <div className="max-w-md p-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Welcome to TaskTrack!
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Get started by creating your first project.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Click the "+" button in the sidebar to create a project.
          </p>
        </div>
      </div>
    );
  }
  
  // Invalid project ID in URL
  if (projectId && !currentProject) {
    // Redirect to first project
    const firstProject = projects[0];
    if (firstProject) {
      return <Navigate to={`/projects/${firstProject.id}/${view}`} replace />;
    }
  }
  
  // Render the appropriate view
  const renderView = () => {
    switch (view) {
      case 'kanban':
        return <KanbanView />;
      case 'list':
        return <ListViewComponent />;
      case 'calendar':
        return <CalendarViewComponent />;
      case 'timeline':
        return <TimelineViewComponent />;
      case 'dashboard':
        return <DashboardViewComponent />;
      default:
        return <KanbanView />;
    }
  };
  
  return renderView();
};

// People View Wrapper
const PeopleViewWrapper: React.FC = () => {
  const { projects, loading } = useProjects();
  const { setCurrentView } = useApp();
  
  // Set current view to null when on people page
  useEffect(() => {
    setCurrentView('kanban'); // Default view, but sidebar will show People as active
  }, [setCurrentView]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }
  
  return <PeopleView />;
};

// Main App Content
const AppContent: React.FC = () => {
  const { projects, loading } = useProjects();
  
  // Loading state for initial app load
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }
  
  return (
    <Routes>
      {/* Root redirect */}
      <Route
        path="/"
        element={
          projects.length > 0 ? (
            <Navigate to={`/projects/${projects[0].id}/kanban`} replace />
          ) : (
            <TaskProviderWrapper>
              <Layout>
                <ProjectViewWrapper view="kanban" />
              </Layout>
            </TaskProviderWrapper>
          )
        }
      />
      
      {/* People route */}
      <Route
        path="/people"
        element={
          <Layout>
            <PeopleViewWrapper />
          </Layout>
        }
      />
      
      {/* Project routes */}
      <Route
        path="/projects/:projectId/kanban"
        element={
          <TaskProviderWrapper>
            <Layout>
              <ProjectViewWrapper view="kanban" />
            </Layout>
          </TaskProviderWrapper>
        }
      />
      <Route
        path="/projects/:projectId/list"
        element={
          <TaskProviderWrapper>
            <Layout>
              <ProjectViewWrapper view="list" />
            </Layout>
          </TaskProviderWrapper>
        }
      />
      <Route
        path="/projects/:projectId/calendar"
        element={
          <TaskProviderWrapper>
            <Layout>
              <ProjectViewWrapper view="calendar" />
            </Layout>
          </TaskProviderWrapper>
        }
      />
      <Route
        path="/projects/:projectId/timeline"
        element={
          <TaskProviderWrapper>
            <Layout>
              <ProjectViewWrapper view="timeline" />
            </Layout>
          </TaskProviderWrapper>
        }
      />
      <Route
        path="/projects/:projectId/dashboard"
        element={
          <TaskProviderWrapper>
            <Layout>
              <ProjectViewWrapper view="dashboard" />
            </Layout>
          </TaskProviderWrapper>
        }
      />
      
      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

// Root App Component with Providers
function App() {
  return (
    <AppProvider>
      <ProjectProvider>
        <PeopleProvider>
          <TagProvider>
            <ToastProvider>
              <ShortcutProvider>
                <CommandPaletteProvider>
                  <CustomFieldProvider>
                    <TaskProviderWrapper>
                      <SavedViewProvider>
                        <NoteProvider>
                          <AppContent />
                          <ToastContainer />
                          <ShortcutHelp />
                          <CommandPalette />
                        </NoteProvider>
                      </SavedViewProvider>
                    </TaskProviderWrapper>
                  </CustomFieldProvider>
                </CommandPaletteProvider>
              </ShortcutProvider>
            </ToastProvider>
          </TagProvider>
        </PeopleProvider>
      </ProjectProvider>
    </AppProvider>
  );
}

export default App;
