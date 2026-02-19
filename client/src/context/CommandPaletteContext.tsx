import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { setCommandPaletteCallback } from './ShortcutContext';

// Context type definition
interface CommandPaletteContextType {
  isOpen: boolean;
  openPalette: () => void;
  closePalette: () => void;
  togglePalette: () => void;
}

// Create context with default values
const CommandPaletteContext = createContext<CommandPaletteContextType | undefined>(undefined);

/**
 * Provider component for command palette state management
 */
export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openPalette = useCallback(() => setIsOpen(true), []);
  const closePalette = useCallback(() => setIsOpen(false), []);
  const togglePalette = useCallback(() => setIsOpen(prev => !prev), []);

  // Register callback with ShortcutContext for Cmd+K shortcut
  useEffect(() => {
    setCommandPaletteCallback(togglePalette);
    return () => setCommandPaletteCallback(null);
  }, [togglePalette]);

  const value: CommandPaletteContextType = {
    isOpen,
    openPalette,
    closePalette,
    togglePalette,
  };

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
    </CommandPaletteContext.Provider>
  );
}

/**
 * Hook to access command palette context
 */
export function useCommandPalette(): CommandPaletteContextType {
  const context = useContext(CommandPaletteContext);
  if (!context) {
    throw new Error('useCommandPalette must be used within a CommandPaletteProvider');
  }
  return context;
}

export default CommandPaletteContext;
