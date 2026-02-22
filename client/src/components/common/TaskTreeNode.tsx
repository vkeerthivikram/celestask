'use client';

import React, { useMemo, useState } from 'react';
import type { TreeNode } from '../../types';
import type { Task } from '../../types';
import { STATUS_CONFIG } from '../../types';
import { TreeNodeRenderer } from './TreeView';
import { AppContextMenu, type AppContextMenuItem } from './AppContextMenu';

interface TaskTreeNodeProps {
  node: TreeNode<Task>;
  depth: number;
  isExpanded: boolean;
  onToggle: () => void;
  isSelected: boolean;
  onSelect: (task: Task) => void;
  onCreateSubTask?: (parentId: number) => void;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (task: Task) => void;
}

export function TaskTreeNode({
  node,
  depth,
  isExpanded,
  onToggle,
  isSelected,
  onSelect,
  onCreateSubTask,
  onEditTask,
  onDeleteTask,
}: TaskTreeNodeProps) {
  const task = node.data;
  const hasChildren = node.children.length > 0;
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);
  
  // Get status info
  const statusConfig = STATUS_CONFIG[task.status];
  const assignee = task.assignee;
  const assigneeInitial = assignee?.name?.charAt(0)?.toUpperCase() || '?';

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
        id: 'open-task',
        label: 'Open task',
        onSelect: () => onSelect(task),
      },
    ];

    if (onCreateSubTask) {
      items.push({
        id: 'create-sub-task',
        label: 'Add sub-task',
        onSelect: () => onCreateSubTask(task.id),
      });
    }

    if (onEditTask) {
      items.push({
        id: 'edit-task',
        label: 'Edit task',
        onSelect: () => onEditTask(task),
      });
    }

    if (onDeleteTask) {
      items.push({
        id: 'delete-task',
        label: 'Delete task',
        onSelect: () => onDeleteTask(task),
        danger: true,
      });
    }

    return items;
  }, [onCreateSubTask, onDeleteTask, onEditTask, onSelect, task]);

  const actions = (
    <>
      {onCreateSubTask && (
        <button
          type="button"
          className="p-1 text-gray-400 hover:text-blue-500 rounded"
          onClick={(e) => {
            e.stopPropagation();
            onCreateSubTask(task.id);
          }}
          title="Create sub-task"
          aria-label="Create sub-task"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      )}
      {onEditTask && (
        <button
          type="button"
          className="p-1 text-gray-400 hover:text-blue-500 rounded"
          onClick={(e) => {
            e.stopPropagation();
            onEditTask(task);
          }}
          title="Edit task"
          aria-label="Edit task"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      )}
      {onDeleteTask && (
        <button
          type="button"
          className="p-1 text-gray-400 hover:text-red-500 rounded"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteTask(task);
          }}
          title="Delete task"
          aria-label="Delete task"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}
    </>
  );

  // Build label with status indicator and optional assignee
  const labelContent = (
    <div className="flex items-center gap-2">
      <div 
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: statusConfig.color }}
        title={statusConfig.label}
      />
      <span className="truncate">{task.title}</span>
      {assignee && (
        <div 
          className="w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0"
          title={assignee.name}
        >
          <span className="text-primary-600 dark:text-primary-400 text-xs font-medium">
            {assigneeInitial}
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
        onClick={() => onSelect(task)}
        onContextMenu={handleContextMenu}
        onKeyboardContextMenu={handleKeyboardContextMenu}
        actions={actions}
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

export default TaskTreeNode;
