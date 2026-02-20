'use client';

import React from 'react';
import { Modal } from './Modal';
import { useShortcuts, type ShortcutCategory } from '../../context/ShortcutContext';

// Category display configuration
const CATEGORY_CONFIG: Record<ShortcutCategory, { title: string; icon: React.ReactNode }> = {
  navigation: {
    title: 'Navigation',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
  },
  actions: {
    title: 'Actions',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  views: {
    title: 'Views',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  system: {
    title: 'System',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
};

// Order of categories to display
const CATEGORY_ORDER: ShortcutCategory[] = ['navigation', 'actions', 'views', 'system'];

interface ShortcutHelpProps {
  className?: string;
}

/**
 * Modal component that displays all keyboard shortcuts
 */
export function ShortcutHelp({ className }: ShortcutHelpProps) {
  const { shortcuts, isHelpOpen, closeHelp } = useShortcuts();
  
  // Group shortcuts by category
  const shortcutsByCategory = React.useMemo(() => {
    const grouped: Record<ShortcutCategory, typeof shortcuts> = {
      navigation: [],
      actions: [],
      views: [],
      system: [],
    };
    
    for (const shortcut of shortcuts) {
      grouped[shortcut.category].push(shortcut);
    }
    
    return grouped;
  }, [shortcuts]);
  
  return (
    <Modal
      isOpen={isHelpOpen}
      onClose={closeHelp}
      title="Keyboard Shortcuts"
      size="md"
      className={className}
    >
      <div className="space-y-6">
        {/* Header hint */}
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Press the key combination to trigger the action. Shortcuts are disabled while typing in input fields.
        </p>
        
        {/* Shortcuts by category */}
        {CATEGORY_ORDER.map(category => {
          const categoryShortcuts = shortcutsByCategory[category];
          if (categoryShortcuts.length === 0) return null;
          
          const config = CATEGORY_CONFIG[category];
          
          return (
            <div key={category} className="space-y-3">
              {/* Category header */}
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <span className="text-gray-400 dark:text-gray-500">{config.icon}</span>
                {config.title}
              </div>
              
              {/* Shortcuts list */}
              <div className="space-y-2">
                {categoryShortcuts.map(shortcut => (
                  <div
                    key={shortcut.id}
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-800/50"
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {shortcut.description}
                    </span>
                    <kbd className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 text-xs font-semibold text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded shadow-sm">
                      {formatDisplayKey(shortcut.displayKey)}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        
        {/* Footer hint */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
            Tip: Press <kbd className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">Esc</kbd> to close this dialog
          </p>
        </div>
      </div>
    </Modal>
  );
}

/**
 * Format display key for better readability
 */
function formatDisplayKey(key: string): string {
  // Detect OS and show appropriate modifier symbol
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  
  return key
    .replace('⌘', isMac ? '⌘' : 'Ctrl+')
    .replace('Ctrl+', isMac ? '⌘' : 'Ctrl+');
}

export default ShortcutHelp;
