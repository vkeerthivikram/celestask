'use client';

import React from 'react';
import type { TreeNode } from '../../types';
import type { Task } from '../../types';
import { TreeNodeRenderer } from './TreeView';
import { MiniProgressBar } from './ProgressBar';
import { STATUS_CONFIG } from '../../types';

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
  showProgress?: boolean;
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
  showProgress = true,
}: TaskTreeNodeProps) {
  const task = node.data;
  const hasChildren = node.children.length > 0;
  const statusConfig = STATUS_CONFIG[task.status];
  const progress = task.progress_percent ?? 0;

  const label = (
    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: statusConfig.color }}
          title={statusConfig.label}
        />
        <span className="truncate text-sm">{task.title}</span>
      </div>
      {showProgress && progress > 0 && (
        <MiniProgressBar percent={progress} className="ml-4" />
      )}
    </div>
  );

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

  return (
    <TreeNodeRenderer
      depth={depth}
      isExpanded={isExpanded}
      hasChildren={hasChildren}
      onToggle={onToggle}
      label={label}
      isSelected={isSelected}
      onClick={() => onSelect(task)}
      actions={actions}
    />
  );
}

export default TaskTreeNode;
