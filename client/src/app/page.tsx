'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useProjects } from '@/context/ProjectContext';
import { Layout } from '@/components/layout/Layout';

export default function HomePage() {
  const router = useRouter();
  const { projects, loading } = useProjects();

  useEffect(() => {
    if (!loading && projects.length > 0) {
      router.replace(`/projects/${projects[0].id}/kanban`);
    }
  }, [projects, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // No projects yet — show empty state inside the app layout
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
          <p className="text-sm text-gray-500">
            Click the &quot;+&quot; button in the sidebar to create a project.
          </p>
        </div>
      </div>
    </Layout>
  );
}
