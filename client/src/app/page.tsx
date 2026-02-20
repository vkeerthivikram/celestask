'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useProjects } from '@/context/ProjectContext';

export default function HomePage() {
  const router = useRouter();
  const { projects, loading } = useProjects();

  useEffect(() => {
    if (!loading) {
      if (projects.length > 0) {
        router.replace(`/projects/${projects[0].id}/kanban`);
      }
      // If no projects, stay on root; layout will show the app with empty state
    }
  }, [projects, loading, router]);

  return (
    <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    </div>
  );
}
