'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export type SortKey = 'title' | 'status' | 'priority' | 'due_date' | 'created_at';
export type SortOrder = 'asc' | 'desc';

interface SortHeaderProps {
  label: string;
  sortKey: SortKey;
  currentSort: SortKey;
  sortOrder: SortOrder;
  onSort: (sortKey: SortKey) => void;
  className?: string;
}

export function SortHeader({
  label,
  sortKey,
  currentSort,
  sortOrder,
  onSort,
  className,
}: SortHeaderProps) {
  const isActive = currentSort === sortKey;

  const handleClick = () => {
    onSort(sortKey);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSort(sortKey);
    }
  };

  const renderSortIcon = () => {
    if (!isActive) {
      return (
        <ArrowUpDown
          className="w-4 h-4 text-gray-400 dark:text-gray-500"
          aria-hidden="true"
        />
      );
    }

    return sortOrder === 'asc' ? (
      <ArrowUp
        className="w-4 h-4 text-primary-600 dark:text-primary-400"
        aria-hidden="true"
      />
    ) : (
      <ArrowDown
        className="w-4 h-4 text-primary-600 dark:text-primary-400"
        aria-hidden="true"
      />
    );
  };

  return (
    <th
      className={twMerge(
        clsx(
          'sticky top-0 z-10',
          'px-4 py-3 text-left text-xs font-semibold',
          'text-gray-600 dark:text-gray-300',
          'bg-gray-50 dark:bg-gray-800/80',
          'border-b border-gray-200 dark:border-gray-700',
          'cursor-pointer select-none',
          'hover:bg-gray-100 dark:hover:bg-gray-700/50',
          'transition-colors duration-150',
          className
        )
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="columnheader"
      aria-sort={isActive ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <div className="flex items-center gap-2">
        <span>{label}</span>
        {renderSortIcon()}
      </div>
    </th>
  );
}

export default SortHeader;
