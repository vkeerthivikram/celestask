'use client';

import React, { useState, useCallback, ReactNode } from 'react';
import type { TreeNode } from '../../types';

interface TreeViewProps<T> {
  nodes: TreeNode<T>[];
  renderNode: (node: TreeNode<T>, depth: number, isExpanded: boolean, onToggle: () => void) => ReactNode;
  defaultExpanded?: boolean;
  onExpand?: (node: TreeNode<T>) => void;
  onCollapse?: (node: TreeNode<T>) => void;
  className?: string;
}

function TreeViewInner<T>({
  nodes,
  renderNode,
  defaultExpanded = false,
  onExpand,
  onCollapse,
  className = '',
}: TreeViewProps<T>) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string | number>>(() => {
    if (defaultExpanded) {
      const allIds = new Set<string | number>();
      const collectIds = (nodeList: TreeNode<T>[]) => {
        nodeList.forEach((node) => {
          if ('id' in node.data) {
            allIds.add((node.data as { id: string | number }).id);
          }
          if (node.children.length > 0) {
            collectIds(node.children);
          }
        });
      };
      collectIds(nodes);
      return allIds;
    }
    return new Set();
  });

  const toggleNode = useCallback(
    (node: TreeNode<T>) => {
      const nodeId = (node.data as { id: string | number }).id;
      setExpandedNodes((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(nodeId)) {
          newSet.delete(nodeId);
          onCollapse?.(node);
        } else {
          newSet.add(nodeId);
          onExpand?.(node);
        }
        return newSet;
      });
    },
    [onExpand, onCollapse]
  );

  const renderTree = (nodeList: TreeNode<T>[], depth: number = 0): ReactNode => {
    return nodeList.map((node) => {
      const nodeId = (node.data as { id: string | number }).id;
      const isExpanded = expandedNodes.has(nodeId);
      const hasChildren = node.children.length > 0;

      return (
        <li key={nodeId} className="list-none">
          {renderNode(
            node,
            depth,
            isExpanded,
            hasChildren ? () => toggleNode(node) : () => {}
          )}
          {hasChildren && isExpanded && (
            <ul className="list-none pl-0 m-0">
              {renderTree(node.children, depth + 1)}
            </ul>
          )}
        </li>
      );
    });
  };

  return (
    <ul className={`list-none pl-0 m-0 ${className}`} role="tree">
      {renderTree(nodes)}
    </ul>
  );
}

// Export with generic support
export function TreeView<T>(props: TreeViewProps<T>) {
  return <TreeViewInner<T> {...props} />;
}

// Tree Node Component for rendering individual nodes
interface TreeNodeRendererProps {
  depth: number;
  isExpanded: boolean;
  hasChildren: boolean;
  onToggle: () => void;
  label: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  isSelected?: boolean;
  onClick?: () => void;
  color?: string;
  className?: string;
}

export function TreeNodeRenderer({
  depth,
  isExpanded,
  hasChildren,
  onToggle,
  label,
  icon,
  actions,
  isSelected = false,
  onClick,
  color,
  className = '',
}: TreeNodeRendererProps) {
  const paddingLeft = depth * 16 + 8;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (hasChildren && e.key === ' ') {
        onToggle();
      } else if (onClick) {
        onClick();
      }
    } else if (e.key === 'ArrowRight' && hasChildren && !isExpanded) {
      onToggle();
    } else if (e.key === 'ArrowLeft' && hasChildren && isExpanded) {
      onToggle();
    }
  };

  return (
    <div
      className={`
        flex items-center gap-1 py-1.5 px-2 rounded-md cursor-pointer
        transition-colors duration-150 group
        ${isSelected ? 'bg-blue-100 text-blue-900' : 'hover:bg-gray-100'}
        ${className}
      `}
      style={{ paddingLeft }}
      role="treeitem"
      aria-expanded={hasChildren ? isExpanded : undefined}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onClick={onClick}
    >
      {/* Expand/Collapse Button */}
      <button
        type="button"
        className={`
          w-5 h-5 flex items-center justify-center rounded
          transition-colors duration-150
          ${hasChildren ? 'hover:bg-gray-200 text-gray-500' : 'text-transparent'}
        `}
        onClick={(e) => {
          e.stopPropagation();
          if (hasChildren) onToggle();
        }}
        aria-label={isExpanded ? 'Collapse' : 'Expand'}
      >
        {hasChildren && (
          <svg
            className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        )}
      </button>

      {/* Color Indicator */}
      {color && (
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
      )}

      {/* Icon */}
      {icon && <span className="flex-shrink-0">{icon}</span>}

      {/* Label */}
      <span className="flex-1 truncate text-sm">{label}</span>

      {/* Actions */}
      {actions && (
        <span
          className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          {actions}
        </span>
      )}
    </div>
  );
}

export default TreeView;
