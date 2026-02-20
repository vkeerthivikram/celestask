'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Layout } from '@/components/layout/Layout';
import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import { ListView } from '@/components/list/ListView';
import { CalendarView } from '@/components/calendar/CalendarView';
import { TimelineView } from '@/components/timeline/TimelineView';
import { DashboardView } from '@/components/dashboard/DashboardView';
import { useApp } from '@/context/AppContext';
import { useProjects } from '@/context/ProjectContext';
import type { ViewType } from '@/types';

const VALID_VIEWS: ViewType[] = ['kanban', 'list', 'calendar', 'timeline', 'dashboard'];

export default function ProjectViewPage() {
  const params = useParams<{ projectId: string; view: string }>();
  const router = useRouter();
  const { setCurrentView, setCurrentProjectId } = useApp();
  const { projects, loading, currentProject, setCurrentProjectById } = useProjects();

  const projectId = params?.projectId ? parseInt(params.projectId, 10) : null;
  const view = params?.view as ViewType;

  // Sync project from URL
  useEffect(() => {
    if (projectId && !isNaN(projectId)) {
      setCurrentProjectId(projectId);
      setCurrentProjectById(projectId);
    }
  }, [projectId, setCurrentProjectId, setCurrentProjectById]);

  // Sync view from URL
  useEffect(() => {
    if (view && VALID_VIEWS.includes(view)) {
      setCurrentView(view);
    }
  }, [view, setCurrentView]);

  // Redirect if projectId is invalid once projects are loaded
  useEffect(() => {
    if (!loading && projects.length > 0 && projectId && !isNaN(projectId)) {
      const found = projects.find((p) => p.id === projectId);
      if (!found) {
        router.replace(`/projects/${projects[0].id}/${view || 'kanban'}`);
      }
    }
  }, [loading, projects, projectId, view, router]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
        </div>
      </Layout>
    );
  }

  if (projects.length === 0) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
          <div className="max-w-md p-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Welcome to TaskTrack!
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Get started by creating your first project.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Click the &quot;+&quot; button in the sidebar to create a project.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  const renderView = () => {
    switch (view) {
      case 'kanban':
        return <KanbanBoard />;
      case 'list':
        return <ListView />;
      case 'calendar':
        return <CalendarView />;
      case 'timeline':
        return <TimelineView />;
      case 'dashboard':
        return <DashboardView />;
      default:
        return <KanbanBoard />;
    }
  };

  return <Layout>{renderView()}</Layout>;
}
