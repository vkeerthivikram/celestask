import React, { forwardRef, type HTMLAttributes, type ReactNode, useState } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  AlertTriangle,
  ArrowUp,
  Minus,
  ArrowDown,
} from 'lucide-react';
import type { TaskStatus, TaskPriority, Tag } from '../../types';

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  outlined?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: [
    'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    'outlined:bg-transparent outlined:border-gray-300 outlined:text-gray-700 dark:outlined:border-gray-600 dark:outlined:text-gray-300',
  ].join(' '),
  primary: [
    'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400',
    'outlined:bg-transparent outlined:border-primary-500 outlined:text-primary-600 dark:outlined:text-primary-400',
  ].join(' '),
  success: [
    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    'outlined:bg-transparent outlined:border-green-500 outlined:text-green-600 dark:outlined:text-green-400',
  ].join(' '),
  warning: [
    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    'outlined:bg-transparent outlined:border-amber-500 outlined:text-amber-600 dark:outlined:text-amber-400',
  ].join(' '),
  danger: [
    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    'outlined:bg-transparent outlined:border-red-500 outlined:text-red-600 dark:outlined:text-red-400',
  ].join(' '),
  info: [
    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'outlined:bg-transparent outlined:border-blue-500 outlined:text-blue-600 dark:outlined:text-blue-400',
  ].join(' '),
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-1.5 py-0.5 text-xs',
  md: 'px-2 py-0.5 text-xs',
  lg: 'px-2.5 py-1 text-sm',
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      className,
      children,
      variant = 'default',
      size = 'md',
      dot = false,
      outlined = false,
      ...props
    },
    ref
  ) => {
    const dotColors: Record<BadgeVariant, string> = {
      default: 'bg-gray-500',
      primary: 'bg-primary-500',
      success: 'bg-green-500',
      warning: 'bg-amber-500',
      danger: 'bg-red-500',
      info: 'bg-blue-500',
    };

    return (
      <span
        ref={ref}
        className={twMerge(
          clsx(
            'inline-flex items-center font-medium rounded-full',
            variantStyles[variant],
            sizeStyles[size],
            outlined && 'border',
            className
          )
        )}
        {...props}
      >
        {dot && (
          <span
            className={clsx('mr-1.5 h-1.5 w-1.5 rounded-full', dotColors[variant])}
            aria-hidden="true"
          />
        )}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

// Status Badge Component
interface StatusBadgeProps extends Omit<BadgeProps, 'variant' | 'children'> {
  status: TaskStatus;
  children?: ReactNode;
}

const statusVariants: Record<TaskStatus, BadgeVariant> = {
  backlog: 'default',
  todo: 'primary',
  in_progress: 'warning',
  review: 'info',
  done: 'success',
};

const statusLabels: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
};

export const StatusBadge = forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ status, children, ...props }, ref) => {
    return (
      <Badge ref={ref} variant={statusVariants[status]} dot {...props}>
        {children || statusLabels[status]}
      </Badge>
    );
  }
);

StatusBadge.displayName = 'StatusBadge';

// Priority Badge Component with accessibility improvements
interface PriorityBadgeProps extends Omit<BadgeProps, 'variant' | 'children'> {
  priority: TaskPriority;
  children?: ReactNode;
  showIcon?: boolean;
  showLabel?: boolean;
}

const priorityVariants: Record<TaskPriority, BadgeVariant> = {
  low: 'default',
  medium: 'primary',
  high: 'warning',
  urgent: 'danger',
};

const priorityLabels: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

// Priority icon configuration with WCAG-compliant colors
const priorityIconConfig: Record<TaskPriority, {
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  pattern: string;
}> = {
  urgent: {
    icon: AlertTriangle,
    colorClass: 'text-red-600 dark:text-red-400',
    pattern: 'Solid background',
  },
  high: {
    icon: ArrowUp,
    colorClass: 'text-orange-600 dark:text-orange-400',
    pattern: 'Diagonal lines',
  },
  medium: {
    icon: Minus,
    colorClass: 'text-blue-600 dark:text-blue-400',
    pattern: 'Dotted',
  },
  low: {
    icon: ArrowDown,
    colorClass: 'text-gray-600 dark:text-gray-400',
    pattern: 'Striped',
  },
};

export const PriorityBadge = forwardRef<HTMLSpanElement, PriorityBadgeProps>(
  ({ priority, children, showIcon = true, showLabel = true, className, ...props }, ref) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const config = priorityIconConfig[priority];
    const IconComponent = config.icon;
    const label = children || priorityLabels[priority];
    
    return (
      <span
        ref={ref}
        className={twMerge(
          clsx(
            'inline-flex items-center font-medium rounded-full',
            variantStyles[priorityVariants[priority]],
            sizeStyles['sm'],
            'relative',
            className
          )
        )}
        role="img"
        aria-label={`Priority: ${priorityLabels[priority]}`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        {...props}
      >
        {showIcon && (
          <IconComponent
            className={twMerge(clsx('w-3 h-3 mr-1', config.colorClass))}
            aria-hidden="true"
          />
        )}
        {showLabel && (
          <span>{label}</span>
        )}
        
        {/* Tooltip for screen readers and hover */}
        {showTooltip && (
          <span
            role="tooltip"
            className={twMerge(
              clsx(
                'absolute bottom-full left-1/2 -translate-x-1/2 mb-2',
                'px-2 py-1 text-xs whitespace-nowrap',
                'bg-gray-900 dark:bg-gray-700 text-white',
                'rounded-md shadow-lg',
                'z-50',
                'animate-fade-in'
              )
            )}
          >
            {priorityLabels[priority]} Priority
            <span
              className={twMerge(
                clsx(
                  'absolute top-full left-1/2 -translate-x-1/2',
                  'border-4 border-transparent',
                  'border-t-gray-900 dark:border-t-gray-700'
                )
              )}
              aria-hidden="true"
            />
          </span>
        )}
      </span>
    );
  }
);

PriorityBadge.displayName = 'PriorityBadge';

// Tag Badge Component
interface TagBadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'size'> {
  tag: Tag;
  size?: BadgeSize;
}

export const TagBadge = forwardRef<HTMLSpanElement, TagBadgeProps>(
  ({ tag, size = 'md', className, ...props }, ref) => {
    // Calculate contrasting text color based on tag background
    const getContrastColor = (hexColor: string): string => {
      const hex = hexColor.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return luminance > 0.5 ? '#1f2937' : '#f9fafb'; // gray-800 or gray-50
    };

    const textColor = getContrastColor(tag.color);
    const sizeStylesMap: Record<BadgeSize, string> = {
      sm: 'px-1.5 py-0.5 text-xs',
      md: 'px-2 py-0.5 text-xs',
      lg: 'px-2.5 py-1 text-sm',
    };

    return (
      <span
        ref={ref}
        className={twMerge(
          clsx(
            'inline-flex items-center font-medium rounded-full',
            sizeStylesMap[size],
            className
          )
        )}
        style={{
          backgroundColor: tag.color,
          color: textColor,
        }}
        {...props}
      >
        <span
          className="mr-1.5 h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: textColor }}
          aria-hidden="true"
        />
        {tag.name}
      </span>
    );
  }
);

TagBadge.displayName = 'TagBadge';

export default Badge;
