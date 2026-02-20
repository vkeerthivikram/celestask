'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

// Toast type definition
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  dismissible?: boolean;
  undoAction?: () => void;
  undoLabel?: string;
  createdAt: number;
}

export interface ToastOptions {
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  dismissible?: boolean;
  undoAction?: () => void;
  undoLabel?: string;
}

// Default durations by type (in milliseconds)
const DEFAULT_DURATIONS: Record<ToastType, number> = {
  success: 4000,
  info: 4000,
  warning: 5000,
  error: 6000, // Longer for errors so users can read them
};

// Maximum number of visible toasts
const MAX_VISIBLE_TOASTS = 5;

// Context type definition
interface ToastContextType {
  toasts: Toast[];
  showToast: (options: ToastOptions) => string;
  dismissToast: (id: string) => void;
  dismissAllToasts: () => void;
  // Convenience methods
  success: (title: string, message?: string, options?: Partial<ToastOptions>) => string;
  error: (title: string, message?: string, options?: Partial<ToastOptions>) => string;
  warning: (title: string, message?: string, options?: Partial<ToastOptions>) => string;
  info: (title: string, message?: string, options?: Partial<ToastOptions>) => string;
}

// Create context with default values
const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Generate unique toast ID
let toastCounter = 0;
function generateToastId(): string {
  return `toast-${Date.now()}-${++toastCounter}`;
}

/**
 * Provider component for toast notifications
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  
  // Clear all timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach(timer => clearTimeout(timer));
      timersRef.current.clear();
    };
  }, []);
  
  // Show a new toast
  const showToast = useCallback((options: ToastOptions): string => {
    const id = generateToastId();
    const duration = options.duration ?? DEFAULT_DURATIONS[options.type];
    
    const toast: Toast = {
      id,
      type: options.type,
      title: options.title,
      message: options.message,
      duration,
      dismissible: options.dismissible ?? true,
      undoAction: options.undoAction,
      undoLabel: options.undoLabel,
      createdAt: Date.now(),
    };
    
    // Add toast and limit to max visible
    setToasts(prev => {
      const newToasts = [...prev, toast];
      // Keep only the most recent MAX_VISIBLE_TOASTS
      return newToasts.slice(-MAX_VISIBLE_TOASTS);
    });
    
    // Set auto-dismiss timer
    if (duration > 0) {
      const timer = setTimeout(() => {
        dismissToast(id);
      }, duration);
      timersRef.current.set(id, timer);
    }
    
    return id;
  }, []);
  
  // Dismiss a specific toast
  const dismissToast = useCallback((id: string) => {
    // Clear the timer if it exists
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);
  
  // Dismiss all toasts
  const dismissAllToasts = useCallback(() => {
    // Clear all timers
    timersRef.current.forEach(timer => clearTimeout(timer));
    timersRef.current.clear();
    
    setToasts([]);
  }, []);
  
  // Convenience methods
  const success = useCallback(
    (title: string, message?: string, options?: Partial<ToastOptions>): string => {
      return showToast({ ...options, type: 'success', title, message });
    },
    [showToast]
  );
  
  const error = useCallback(
    (title: string, message?: string, options?: Partial<ToastOptions>): string => {
      return showToast({ ...options, type: 'error', title, message });
    },
    [showToast]
  );
  
  const warning = useCallback(
    (title: string, message?: string, options?: Partial<ToastOptions>): string => {
      return showToast({ ...options, type: 'warning', title, message });
    },
    [showToast]
  );
  
  const info = useCallback(
    (title: string, message?: string, options?: Partial<ToastOptions>): string => {
      return showToast({ ...options, type: 'info', title, message });
    },
    [showToast]
  );
  
  const value: ToastContextType = {
    toasts,
    showToast,
    dismissToast,
    dismissAllToasts,
    success,
    error,
    warning,
    info,
  };
  
  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
}

/**
 * Hook to access toast context
 */
export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export default ToastContext;
