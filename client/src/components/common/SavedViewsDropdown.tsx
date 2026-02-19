import React, { useState, useRef, useEffect } from 'react';
import type { SavedView } from '../../types';

interface SavedViewsDropdownProps {
  views: SavedView[];
  currentViewId?: string;
  onSelect: (view: SavedView) => void;
  onDelete: (view: SavedView) => void;
  onSetDefault: (view: SavedView) => void;
  loading?: boolean;
}

export default function SavedViewsDropdown({
  views,
  currentViewId,
  onSelect,
  onDelete,
  onSetDefault,
  loading = false,
}: SavedViewsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (views.length === 0) {
    return null;
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
          />
        </svg>
        Saved Views
        <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 py-0.5 px-1.5 rounded text-xs">
          {views.length}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute z-20 mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg"
          role="listbox"
        >
          <ul className="py-1 max-h-60 overflow-auto">
            {views.map(view => (
              <SavedViewItem
                key={view.id}
                view={view}
                isActive={view.id === currentViewId}
                onSelect={() => {
                  onSelect(view);
                  setIsOpen(false);
                }}
                onDelete={() => {
                  onDelete(view);
                }}
                onSetDefault={() => {
                  onSetDefault(view);
                }}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

interface SavedViewItemProps {
  view: SavedView;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
}

function SavedViewItem({ view, isActive, onSelect, onDelete, onSetDefault }: SavedViewItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <li
      className={`relative group ${
        isActive ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
      }`}
      role="option"
      aria-selected={isActive}
    >
      <div className="flex items-center justify-between px-3 py-2">
        <button
          type="button"
          onClick={onSelect}
          className="flex-1 flex items-center gap-2 text-left text-sm text-gray-700 dark:text-gray-300"
        >
          {view.is_default && (
            <svg
              className="w-4 h-4 text-yellow-500 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          )}
          <span className={isActive ? 'font-medium' : ''}>{view.name}</span>
        </button>

        {/* Options menu */}
        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="View options"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>

          {showMenu && (
            <div className="absolute right-0 z-30 mt-1 w-40 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg py-1">
              {!view.is_default && (
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    setShowMenu(false);
                    onSetDefault();
                  }}
                  className="w-full text-left px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  Set as Default
                </button>
              )}
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  setShowMenu(false);
                  if (confirm(`Delete saved view "${view.name}"?`)) {
                    onDelete();
                  }
                }}
                className="w-full text-left px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
