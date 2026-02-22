'use client';

import React, { useMemo, useState, useEffect } from 'react';
import type { TreeNode } from '../../types';
import type { Project } from '../../types';
import { TreeNodeRenderer } from './TreeView';
import { AppContextMenu, type AppContextMenuItem } from './AppContextMenu';
import { useTimeEntries } from '@/context/TimeEntryContext';
import { Play, Square } from 'lucide-react';
import { clsx } from 'clsx';
import { formatDurationUsCompact, formatTimerDisplayUs } from '@/utils/timeFormat';

interface ProjectTreeNodeProps {
  node: TreeNode<Project>;
  depth: number;
  isExpanded: boolean;
  onToggle: () => void;
  isSelected: boolean;
  onSelect: (project: Project) => void;
  onCreateSubProject?: (parentId: number) => void;
  onEditProject?: (project: Project) => void;
  onDeleteProject?: (project: Project) => void;
}

export function ProjectTreeNode({
  node,
  depth,
  isExpanded,
  onToggle,
  isSelected,
  onSelect,
  onCreateSubProject,
  onEditProject,
  onDeleteProject,
}: ProjectTreeNodeProps) {
  const project = node.data;
  const hasChildren = node.children.length > 0;
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [totalUs, setTotalUs] = useState(0);
  const [isTimerLoading, setIsTimerLoading] = useState(false);
  
  const {
    timerTick,
    startProjectTimer,
    stopProjectTimer,
    isProjectTimerRunning,
    getRunningTimerForProject,
    fetchProjectTimeSummary,
  } = useTimeEntries();
  
  const isTimerRunning = isProjectTimerRunning(project.id);
  const runningTimer = getRunningTimerForProject(project.id);
  
  useEffect(() => {
    const fetchTime = async () => {
      try {
        const summary = await fetchProjectTimeSummary(project.id);
        setTotalUs(summary.total_time_us);
      } catch (err) {
        console.error('Failed to fetch project time:', err);
      }
    };
    fetchTime();
  }, [project.id, fetchProjectTimeSummary, runningTimer]);
  
  const handleTimerClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsTimerLoading(true);
    try {
      if (isTimerRunning) {
        await stopProjectTimer(project.id);
        const summary = await fetchProjectTimeSummary(project.id);
        setTotalUs(summary.total_time_us);
      } else {
        await startProjectTimer(project.id);
      }
    } catch (err) {
      console.error('Timer action failed:', err);
    } finally {
      setIsTimerLoading(false);
    }
  };
  
  // Get owner display info
  const owner = project.owner;
  const ownerInitial = owner?.name?.charAt(0)?.toUpperCase() || '?';

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
  };

  const handleKeyboardContextMenu = (element: HTMLDivElement) => {
    const rect = element.getBoundingClientRect();
    setContextMenuPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  };

  const closeContextMenu = () => {
    setContextMenuPosition(null);
  };

  const contextMenuItems = useMemo((): AppContextMenuItem[] => {
    const items: AppContextMenuItem[] = [
      {
        id: 'open-project',
        label: 'Open project',
        onSelect: () => onSelect(project),
      },
    ];

    if (onCreateSubProject) {
      items.push({
        id: 'create-sub-project',
        label: 'Add sub-project',
        onSelect: () => onCreateSubProject(project.id),
      });
    }

    if (onEditProject) {
      items.push({
        id: 'edit-project',
        label: 'Edit project',
        onSelect: () => onEditProject(project),
      });
    }

    if (onDeleteProject) {
      items.push({
        id: 'delete-project',
        label: 'Delete project',
        onSelect: () => onDeleteProject(project),
        danger: true,
      });
    }

    return items;
  }, [onCreateSubProject, onDeleteProject, onEditProject, onSelect, project]);

  const actions = (
    <>
      <button
        type="button"
        className={clsx(
          'p-1 rounded transition-colors',
          isTimerRunning
            ? 'text-green-500 hover:text-green-600'
            : 'text-gray-400 hover:text-blue-500'
        )}
        onClick={handleTimerClick}
        disabled={isTimerLoading}
        title={isTimerRunning 
          ? 'Stop timer' 
          : totalUs > 0 
            ? `${formatDurationUsCompact(totalUs)} tracked - Start timer` 
            : 'Start timer'
        }
        aria-label={isTimerRunning ? 'Stop timer' : 'Start timer'}
      >
        {isTimerRunning ? (
          <div className="flex items-center gap-1">
            <Square className="w-4 h-4" />
            <span className="text-xs tabular-nums">
              {runningTimer && formatTimerDisplayUs(runningTimer.start_time)}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <Play className="w-4 h-4" />
            {totalUs > 0 && (
              <span className="text-xs tabular-nums">{formatDurationUsCompact(totalUs)}</span>
            )}
          </div>
        )}
      </button>
      {onCreateSubProject && (
        <button
          type="button"
          className="p-1 text-gray-400 hover:text-blue-500 rounded"
          onClick={(e) => {
            e.stopPropagation();
            onCreateSubProject(project.id);
          }}
          title="Create sub-project"
          aria-label="Create sub-project"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      )}
      {onEditProject && (
        <button
          type="button"
          className="p-1 text-gray-400 hover:text-blue-500 rounded"
          onClick={(e) => {
            e.stopPropagation();
            onEditProject(project);
          }}
          title="Edit project"
          aria-label="Edit project"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      )}
      {onDeleteProject && (
        <button
          type="button"
          className="p-1 text-gray-400 hover:text-red-500 rounded"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteProject(project);
          }}
          title="Delete project"
          aria-label="Delete project"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}
    </>
  );

  // Build label with optional owner indicator
  const labelContent = (
    <div className="flex items-center gap-2">
      <span>{project.name}</span>
      {owner && (
        <div 
          className="w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0"
          title={owner.name}
        >
          <span className="text-primary-600 dark:text-primary-400 text-xs font-medium">
            {ownerInitial}
          </span>
        </div>
      )}
    </div>
  );

  return (
    <>
      <TreeNodeRenderer
        depth={depth}
        isExpanded={isExpanded}
        onToggle={onToggle}
        isSelected={isSelected}
        onClick={() => onSelect(project)}
        onContextMenu={handleContextMenu}
        onKeyboardContextMenu={handleKeyboardContextMenu}
        actions={actions}
        color={project.color}
        label={labelContent}
        hasChildren={hasChildren}
      />
      <AppContextMenu
        open={Boolean(contextMenuPosition)}
        x={contextMenuPosition?.x ?? 0}
        y={contextMenuPosition?.y ?? 0}
        items={contextMenuItems}
        onClose={closeContextMenu}
      />
    </>
  );
}

export default ProjectTreeNode;
