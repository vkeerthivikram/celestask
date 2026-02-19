import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useKeyboardShortcuts, type ShortcutDefinition } from '../hooks/useKeyboardShortcuts';
import { useApp } from './AppContext';
import { useProjects } from './ProjectContext';

// Types for shortcut configuration
export type ShortcutCategory = 'navigation' | 'actions' | 'views' | 'system';

export interface ShortcutConfig {
  id: string;
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  description: string;
  category: ShortcutCategory;
  displayKey: string; // For displaying in help (e.g., "⌘K" or "Ctrl+K")
}

// View types matching AppContext
type ViewType = 'dashboard' | 'kanban' | 'list' | 'calendar' | 'timeline' | 'people';

// Context type definition
interface ShortcutContextType {
  shortcuts: ShortcutConfig[];
  isHelpOpen: boolean;
  openHelp: () => void;
  closeHelp: () => void;
  toggleHelp: () => void;
  isShortcutEnabled: (id: string) => boolean;
}

// Default shortcuts configuration
const DEFAULT_SHORTCUTS: ShortcutConfig[] = [
  // Navigation shortcuts
  {
    id: 'search',
    key: '/',
    description: 'Focus search',
    category: 'navigation',
    displayKey: '/',
  },
  
  // Action shortcuts
  {
    id: 'new-task',
    key: 'n',
    description: 'Create new task',
    category: 'actions',
    displayKey: 'N',
  },
  {
    id: 'new-project',
    key: 'p',
    description: 'Create new project',
    category: 'actions',
    displayKey: 'P',
  },
  
  // View shortcuts
  {
    id: 'view-dashboard',
    key: '1',
    description: 'Go to Dashboard',
    category: 'views',
    displayKey: '1',
  },
  {
    id: 'view-kanban',
    key: '2',
    description: 'Go to Kanban board',
    category: 'views',
    displayKey: '2',
  },
  {
    id: 'view-list',
    key: '3',
    description: 'Go to List view',
    category: 'views',
    displayKey: '3',
  },
  {
    id: 'view-calendar',
    key: '4',
    description: 'Go to Calendar',
    category: 'views',
    displayKey: '4',
  },
  {
    id: 'view-timeline',
    key: '5',
    description: 'Go to Timeline',
    category: 'views',
    displayKey: '5',
  },
  {
    id: 'view-people',
    key: '6',
    description: 'Go to People',
    category: 'views',
    displayKey: '6',
  },
  
  // System shortcuts
  {
    id: 'help',
    key: '?',
    shiftKey: true,
    description: 'Show keyboard shortcuts',
    category: 'system',
    displayKey: '?',
  },
  {
    id: 'escape',
    key: 'Escape',
    description: 'Close modal / Cancel',
    category: 'system',
    displayKey: 'Esc',
  },
  {
    id: 'command-palette',
    key: 'k',
    ctrlKey: true,
    description: 'Open command palette',
    category: 'system',
    displayKey: '⌘K',
  },
];

// Create context with default values
const ShortcutContext = createContext<ShortcutContextType | undefined>(undefined);

// Local storage key for shortcut preferences
const STORAGE_KEY = 'taskflow-shortcut-preferences';

// Global callback for command palette (set by CommandPaletteProvider)
let commandPaletteCallback: (() => void) | null = null;

export function setCommandPaletteCallback(callback: (() => void) | null) {
  commandPaletteCallback = callback;
}

/**
 * Provider component for keyboard shortcuts management
 */
export function ShortcutProvider({ children }: { children: React.ReactNode }) {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [shortcutPreferences, setShortcutPreferences] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });
  
  // Get app context for view switching and modal management
  const appContext = useApp();
  const projectContext = useProjects();
  
  // Memoized shortcuts list (can be extended with custom shortcuts)
  const shortcuts = useMemo(() => DEFAULT_SHORTCUTS, []);
  
  // Check if a shortcut is enabled
  const isShortcutEnabled = useCallback((id: string) => {
    if (id in shortcutPreferences) {
      return shortcutPreferences[id];
    }
    return true; // Enabled by default
  }, [shortcutPreferences]);
  
  // Toggle shortcut enabled state
  const setShortcutEnabled = useCallback((id: string, enabled: boolean) => {
    setShortcutPreferences(prev => {
      const updated = { ...prev, [id]: enabled };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);
  
  // Help modal controls
  const openHelp = useCallback(() => setIsHelpOpen(true), []);
  const closeHelp = useCallback(() => setIsHelpOpen(false), []);
  const toggleHelp = useCallback(() => setIsHelpOpen(prev => !prev), []);
  
  // Build shortcut definitions based on current state
  const shortcutDefinitions: ShortcutDefinition[] = useMemo(() => {
    const definitions: ShortcutDefinition[] = [];
    
    for (const shortcut of shortcuts) {
      if (!isShortcutEnabled(shortcut.id)) continue;
      
      let action: () => void;
      
      switch (shortcut.id) {
        case 'new-task':
          action = () => {
            appContext.openTaskModal();
          };
          break;
          
        case 'new-project':
          action = () => {
            appContext.openProjectModal();
          };
          break;
          
        case 'search':
          action = () => {
            // Focus search input if available
            const searchInput = document.querySelector<HTMLInputElement>('[data-search-input]');
            if (searchInput) {
              searchInput.focus();
            }
          };
          break;
          
        case 'help':
          action = toggleHelp;
          break;
          
        case 'escape':
          action = () => {
            // Close any open modal
            if (appContext.modal.isOpen) {
              appContext.closeModal();
            } else if (isHelpOpen) {
              closeHelp();
            } else if (commandPaletteCallback) {
              // Close command palette if open
            }
          };
          break;
          
        case 'view-dashboard':
          action = () => appContext.setCurrentView('dashboard');
          break;
          
        case 'view-kanban':
          action = () => appContext.setCurrentView('kanban');
          break;
          
        case 'view-list':
          action = () => appContext.setCurrentView('list');
          break;
          
        case 'view-calendar':
          action = () => appContext.setCurrentView('calendar');
          break;
          
        case 'view-timeline':
          action = () => appContext.setCurrentView('timeline');
          break;
          
        case 'view-people':
          action = () => appContext.setCurrentView('people');
          break;
          
        case 'command-palette':
          action = () => {
            if (commandPaletteCallback) {
              commandPaletteCallback();
            }
          };
          break;
          
        default:
          continue;
      }
      
      definitions.push({
        key: shortcut.key,
        ctrlKey: shortcut.ctrlKey,
        metaKey: shortcut.metaKey,
        shiftKey: shortcut.shiftKey,
        altKey: shortcut.altKey,
        action,
        description: shortcut.description,
        enabled: true,
      });
    }
    
    return definitions;
  }, [shortcuts, isShortcutEnabled, appContext, projectContext, isHelpOpen, toggleHelp, closeHelp]);
  
  // Register keyboard shortcuts
  useKeyboardShortcuts({
    shortcuts: shortcutDefinitions,
    enabled: !isHelpOpen, // Disable shortcuts when help modal is open (except Escape)
  });
  
  // Add escape key handler for help modal (always active)
  useKeyboardShortcuts({
    shortcuts: [
      {
        key: 'Escape',
        action: closeHelp,
        enabled: isHelpOpen,
      },
    ],
    enabled: true,
  });
  
  const value: ShortcutContextType = {
    shortcuts,
    isHelpOpen,
    openHelp,
    closeHelp,
    toggleHelp,
    isShortcutEnabled,
  };
  
  return (
    <ShortcutContext.Provider value={value}>
      {children}
    </ShortcutContext.Provider>
  );
}

/**
 * Hook to access shortcut context
 */
export function useShortcuts(): ShortcutContextType {
  const context = useContext(ShortcutContext);
  if (!context) {
    throw new Error('useShortcuts must be used within a ShortcutProvider');
  }
  return context;
}

export default ShortcutContext;
