import React from 'react';
import { useToast } from '../../context/ToastContext';
import { Toast } from './Toast';

interface ToastContainerProps {
  className?: string;
}

/**
 * Container component that renders all active toasts
 * Positioned at the bottom-right of the screen
 */
export function ToastContainer({ className }: ToastContainerProps) {
  const { toasts, dismissToast } = useToast();
  
  if (toasts.length === 0) {
    return null;
  }
  
  return (
    <div
      className={`
        fixed z-50
        bottom-4 right-4
        flex flex-col gap-3
        max-w-sm w-full
        pointer-events-none
        ${className || ''}
      `}
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map(toast => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast toast={toast} onDismiss={dismissToast} />
        </div>
      ))}
    </div>
  );
}

export default ToastContainer;
