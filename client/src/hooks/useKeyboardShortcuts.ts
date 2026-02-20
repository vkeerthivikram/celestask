'use client';

import { useEffect, useCallback } from 'react';

export interface ShortcutDefinition {
  key: string; // Single key or key combination
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: () => void;
  description?: string;
  enabled?: boolean;
}

export interface UseKeyboardShortcutsOptions {
  shortcuts: ShortcutDefinition[];
  enabled?: boolean;
  preventDefault?: boolean;
}

/**
 * Check if the active element is an input, textarea, or contenteditable element
 * where keyboard shortcuts should typically be disabled
 */
function isInputElementActive(): boolean {
  const activeElement = document.activeElement;
  if (!activeElement) return false;

  const tagName = activeElement.tagName.toLowerCase();
  
  // Check for input/textarea elements
  if (tagName === 'input' || tagName === 'textarea') {
    return true;
  }
  
  // Check for contenteditable elements
  if (activeElement.getAttribute('contenteditable') === 'true') {
    return true;
  }
  
  // Check if element is within a form or has role=textbox
  if (activeElement.closest('form') || activeElement.getAttribute('role') === 'textbox') {
    return true;
  }
  
  return false;
}

/**
 * Normalize key for comparison (handle both uppercase and lowercase)
 */
function normalizeKey(key: string): string {
  // For single character keys, convert to lowercase
  if (key.length === 1) {
    return key.toLowerCase();
  }
  // For special keys (ArrowUp, Escape, etc.), keep as-is
  return key;
}

/**
 * Check if a keyboard event matches a shortcut definition
 */
function matchesShortcut(
  event: KeyboardEvent,
  shortcut: ShortcutDefinition
): boolean {
  const normalizedEventKey = normalizeKey(event.key);
  const normalizedShortcutKey = normalizeKey(shortcut.key);
  
  // Check if the key matches
  if (normalizedEventKey !== normalizedShortcutKey) {
    return false;
  }
  
  // For modifier shortcuts (Ctrl/Cmd + key), check modifiers
  if (shortcut.ctrlKey || shortcut.metaKey) {
    // On Mac, metaKey (Cmd) should be checked; on Windows/Linux, ctrlKey
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    
    if (shortcut.ctrlKey && !event.ctrlKey) return false;
    if (shortcut.metaKey && !event.metaKey) return false;
    
    // If neither ctrl nor meta is pressed, fail
    if (!event.ctrlKey && !event.metaKey) return false;
  } else {
    // For non-modifier shortcuts, ensure no modifiers are pressed
    // (unless explicitly specified in the shortcut)
    if (event.ctrlKey && !shortcut.ctrlKey) return false;
    if (event.metaKey && !shortcut.metaKey) return false;
    if (event.shiftKey && !shortcut.shiftKey) return false;
    if (event.altKey && !shortcut.altKey) return false;
  }
  
  // Check other modifiers if specified
  if (shortcut.shiftKey !== undefined && event.shiftKey !== shortcut.shiftKey) {
    return false;
  }
  if (shortcut.altKey !== undefined && event.altKey !== shortcut.altKey) {
    return false;
  }
  
  return true;
}

/**
 * Custom hook for handling keyboard shortcuts
 * 
 * @example
 * ```tsx
 * useKeyboardShortcuts({
 *   shortcuts: [
 *     { key: 'n', action: () => openNewTaskModal() },
 *     { key: 'p', action: () => openNewProjectModal() },
 *     { key: '/', action: () => focusSearch() },
 *     { key: '?', action: () => showHelp() },
 *     { key: '1', action: () => setView('dashboard') },
 *     { key: 'Escape', action: () => closeModal() },
 *     { key: 'k', ctrlKey: true, action: () => openCommandPalette() },
 *   ],
 *   enabled: true,
 * });
 * ```
 */
export function useKeyboardShortcuts({
  shortcuts,
  enabled = true,
  preventDefault = true,
}: UseKeyboardShortcutsOptions): void {
  
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Skip if shortcuts are globally disabled
      if (!enabled) return;
      
      // Skip if we're in an input element (unless it's Escape)
      if (isInputElementActive() && event.key !== 'Escape') {
        return;
      }
      
      // Find a matching shortcut
      for (const shortcut of shortcuts) {
        // Skip if this individual shortcut is disabled
        if (shortcut.enabled === false) continue;
        
        if (matchesShortcut(event, shortcut)) {
          if (preventDefault) {
            event.preventDefault();
          }
          shortcut.action();
          return; // Only trigger the first matching shortcut
        }
      }
    },
    [shortcuts, enabled, preventDefault]
  );
  
  useEffect(() => {
    // Add event listener
    window.addEventListener('keydown', handleKeyDown);
    
    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}

export default useKeyboardShortcuts;
