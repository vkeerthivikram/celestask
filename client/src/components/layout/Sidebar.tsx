'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter, useParams, usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  LayoutDashboard,
  Kanban,
  List,
  Calendar,
  GanttChart,
  FolderPlus,
  ChevronRight,
  X,
  Users,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useProjects } from '../../context/ProjectContext';
import { usePeople } from '../../context/PeopleContext';
import type { ViewType } from '../../types';

interface SidebarProps {
  onAddProject?: () => void;
}

const viewItems: { id: ViewType; label: string; icon: React.ReactNode }[] = [
  { id: 'kanban', label: 'Kanban', icon: <Kanban className="w-4 h-4" /> },
  { id: 'list', label: 'List', icon: <List className="w-4 h-4" /> },
  { id: 'calendar', label: 'Calendar', icon: <Calendar className="w-4 h-4" /> },
  { id: 'timeline', label: 'Timeline', icon: <GanttChart className="w-4 h-4" /> },
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
];

export function Sidebar({ onAddProject }: SidebarProps) {
  const params = useParams<{ projectId?: string }>();
  const projectId = params?.projectId;
  const router = useRouter();
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen, currentView, setCurrentView, setCurrentProjectId } = useApp();
  const { projects, currentProject, setCurrentProject } = useProjects();
  const { people } = usePeople();
  const sidebarRef = useRef<HTMLElement>(null);
  
  // Update current project based on URL
  useEffect(() => {
    if (projectId) {
      const id = parseInt(projectId, 10);
      if (!isNaN(id)) {
        setCurrentProjectId(id);
      }
    }
  }, [projectId, setCurrentProjectId]);
  
  // Handle project click
  const handleProjectClick = (project: typeof projects[0]) => {
    setCurrentProject(project);
    setCurrentProjectId(project.id);
    router.push(`/projects/${project.id}/${currentView}`);
    // Close sidebar on mobile
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };
  
  // Handle view change
  const handleViewChange = (view: ViewType) => {
    setCurrentView(view);
    if (currentProject) {
      router.push(`/projects/${currentProject.id}/${view}`);
    }
    // Close sidebar on mobile
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  // Handle people view click
  const handlePeopleClick = () => {
    router.push('/people');
    // Close sidebar on mobile
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };
  
  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        window.innerWidth < 1024 &&
        sidebarOpen &&
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node)
      ) {
        setSidebarOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [sidebarOpen, setSidebarOpen]);

  // Get owner for a project
  const getOwner = (project: typeof projects[0]) => {
    if (!project.owner_id) return null;
    return people.find(p => p.id === project.owner_id);
  };

  // Check if we're on the people page
  const isPeoplePage = pathname?.startsWith('/people') ?? false;
  
  const sidebarContent = (
    <>
      {/* Logo / Brand */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center">
            <Kanban className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            TaskTrack
          </span>
        </div>
        <button
          onClick={() => setSidebarOpen(false)}
          className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 lg:hidden"
          aria-label="Close sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      
      {/* View Switcher */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
          Views
        </h2>
        <nav className="space-y-1">
          {viewItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleViewChange(item.id)}
              className={twMerge(
                clsx(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium',
                  'transition-colors duration-200',
                  currentView === item.id && !isPeoplePage
                    ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                )
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* People Management */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
          Manage
        </h2>
        <nav className="space-y-1">
          <button
            onClick={handlePeopleClick}
            className={twMerge(
              clsx(
                'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium',
                'transition-colors duration-200',
                isPeoplePage
                  ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              )
            )}
          >
            <Users className="w-4 h-4" />
            People
          </button>
        </nav>
      </div>
      
      {/* Projects List */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            Projects
          </h2>
          {onAddProject && (
            <button
              onClick={onAddProject}
              className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Add project"
            >
              <FolderPlus className="w-4 h-4" />
            </button>
          )}
        </div>
        
        {projects.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No projects yet
            </p>
            {onAddProject && (
              <button
                onClick={onAddProject}
                className="mt-2 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
              >
                Create your first project
              </button>
            )}
          </div>
        ) : (
          <nav className="space-y-1">
            {projects.map((project) => {
              const owner = getOwner(project);
              const ownerInitial = owner?.name?.charAt(0)?.toUpperCase() || '?';
              
              return (
                <button
                  key={project.id}
                  onClick={() => handleProjectClick(project)}
                  className={twMerge(
                    clsx(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium',
                      'transition-colors duration-200',
                      currentProject?.id === project.id
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                    )
                  )}
                >
                  <div
                    className="w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: project.color }}
                  />
                  <span className="truncate flex-1 text-left">{project.name}</span>
                  {owner && (
                    <div 
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-600 flex-shrink-0"
                      title={`Owner: ${owner.name}`}
                    >
                      <div className="w-4 h-4 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                        <span className="text-[10px] font-medium text-primary-600 dark:text-primary-400">
                          {ownerInitial}
                        </span>
                      </div>
                    </div>
                  )}
                  {currentProject?.id === project.id && (
                    <ChevronRight className="w-4 h-4 ml-auto text-gray-400" />
                  )}
                </button>
              );
            })}
          </nav>
        )}
      </div>
      
      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
          Task Tracking v1.0.0
        </p>
      </div>
    </>
  );
  
  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        ref={sidebarRef}
        className={twMerge(
          clsx(
            'hidden lg:flex flex-col w-64 h-screen',
            'bg-white dark:bg-gray-800',
            'border-r border-gray-200 dark:border-gray-700',
            'transition-all duration-300 ease-in-out',
            !sidebarOpen && 'lg:w-0 lg:overflow-hidden'
          )
        )}
      >
        {sidebarContent}
      </aside>
      
      {/* Mobile Sidebar (Overlay) */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          
          {/* Sidebar */}
          <aside
            className={twMerge(
              clsx(
                'fixed inset-y-0 left-0 z-50',
                'flex flex-col w-72 h-screen',
                'bg-white dark:bg-gray-800',
                'animate-slide-left'
              )
            )}
          >
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}

// Add custom animation for mobile sidebar
const styles = `
  @keyframes slideLeft {
    from {
      transform: translateX(-100%);
    }
    to {
      transform: translateX(0);
    }
  }
  
  .animate-slide-left {
    animation: slideLeft 0.3s ease-out;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

export default Sidebar;
