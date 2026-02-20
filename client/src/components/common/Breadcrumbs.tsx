'use client';

import { useMemo } from 'react';
import { useProjects, getProjectAncestors, useProjectSelection } from '../../context/ProjectContext';
import { useApp } from '../../context/AppContext';

interface BreadcrumbItem {
  id: string;
  label: string;
  color?: string;
  isCurrent: boolean;
  onClick?: () => void;
}

interface BreadcrumbsProps {
  /** Optional task title to show at the end of breadcrumbs */
  taskTitle?: string;
  /** Maximum number of items to show before truncating */
  maxItems?: number;
  /** Custom class name */
  className?: string;
}

// Chevron icon for separator
const ChevronIcon = () => (
  <svg 
    className="w-4 h-4 text-gray-400 flex-shrink-0" 
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

// Home icon
const HomeIcon = () => (
  <svg 
    className="w-4 h-4" 
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

/**
 * Truncates breadcrumb items if there are too many
 * Shows first item, ellipsis, then last N-1 items
 */
function truncateBreadcrumbs(
  items: BreadcrumbItem[], 
  maxItems: number
): (BreadcrumbItem | 'ellipsis')[] {
  if (items.length <= maxItems) {
    return items;
  }
  
  // Always show first item, ellipsis, and last (maxItems - 2) items
  const firstItem = items[0];
  const lastItems = items.slice(-(maxItems - 2));
  
  return [firstItem, 'ellipsis', ...lastItems];
}

export function Breadcrumbs({ 
  taskTitle, 
  maxItems = 4,
  className = '' 
}: BreadcrumbsProps) {
  const { projects } = useProjects();
  const { selectedProject, selectProject } = useProjectSelection();
  const { setCurrentView } = useApp();
  
  // Get project hierarchy path
  const breadcrumbItems = useMemo<BreadcrumbItem[]>(() => {
    const items: BreadcrumbItem[] = [];
    
    // Add "Projects" root link
    items.push({
      id: 'root',
      label: 'Projects',
      isCurrent: !selectedProject && !taskTitle,
      onClick: () => {
        setCurrentView('dashboard');
      },
    });
    
    // If there's a selected project, get its ancestor chain
    if (selectedProject) {
      // Find the full project
      const project = projects.find(p => String(p.id) === selectedProject);
      
      if (project) {
        // Get ancestors
        const ancestors = getProjectAncestors(projects, project.id);
        
        // Add the current project to ancestors for display
        const allProjects = [...ancestors, project];
        
        // Add ancestor projects (excluding root which we already added)
        allProjects.forEach((proj, index) => {
          const isLastProject = index === allProjects.length - 1 && !taskTitle;
          items.push({
            id: String(proj.id),
            label: proj.name,
            color: proj.color,
            isCurrent: isLastProject,
            onClick: () => {
              selectProject(String(proj.id));
              setCurrentView('kanban');
            },
          });
        });
      }
    }
    
    // Add task title if provided
    if (taskTitle) {
      items.push({
        id: 'task',
        label: taskTitle,
        isCurrent: true,
      });
    }
    
    return items;
  }, [projects, selectedProject, taskTitle, setCurrentView, selectProject]);
  
  // Truncate if needed
  const displayItems = useMemo(() => {
    return truncateBreadcrumbs(breadcrumbItems, maxItems);
  }, [breadcrumbItems, maxItems]);
  
  // Don't render if only showing root
  if (breadcrumbItems.length <= 1 && !taskTitle) {
    return null;
  }
  
  return (
    <nav 
      className={`flex items-center gap-1 text-sm ${className}`}
      aria-label="Breadcrumb"
    >
      <ol className="flex items-center gap-1 flex-wrap">
        {displayItems.map((item, index) => {
          // Handle ellipsis
          if (item === 'ellipsis') {
            return (
              <li key="ellipsis" className="flex items-center gap-1">
                <span className="text-gray-400 px-1">…</span>
                <ChevronIcon />
              </li>
            );
          }
          
          return (
            <li key={item.id} className="flex items-center gap-1">
              {index > 0 && <ChevronIcon />}
              
              {item.isCurrent ? (
                // Current item - not clickable, bold
                <span 
                  className="font-semibold text-gray-900 truncate max-w-[200px]"
                  title={item.label}
                  style={item.color ? { color: item.color } : undefined}
                >
                  {item.label}
                </span>
              ) : (
                // Clickable ancestor
                <button
                  onClick={item.onClick}
                  className="text-gray-500 hover:text-gray-700 hover:underline transition-colors truncate max-w-[150px] flex items-center gap-1"
                  title={item.label}
                >
                  {item.id === 'root' && <HomeIcon />}
                  {item.color && (
                    <span 
                      className="w-2 h-2 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: item.color }}
                    />
                  )}
                  <span className="truncate">{item.label}</span>
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default Breadcrumbs;
