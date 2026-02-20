'use client';

import React, { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: [
    'bg-primary-600 text-white',
    'hover:bg-primary-700',
    'focus:ring-primary-500',
    'disabled:bg-primary-300 disabled:cursor-not-allowed',
  ].join(' '),
  secondary: [
    'bg-gray-100 text-gray-900',
    'dark:bg-gray-700 dark:text-gray-100',
    'hover:bg-gray-200 dark:hover:bg-gray-600',
    'focus:ring-gray-500',
    'disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:text-gray-400',
  ].join(' '),
  outline: [
    'border-2 border-primary-600 text-primary-600',
    'dark:border-primary-400 dark:text-primary-400',
    'hover:bg-primary-50 dark:hover:bg-primary-900/20',
    'focus:ring-primary-500',
    'disabled:border-gray-300 disabled:text-gray-300 dark:disabled:border-gray-600 dark:disabled:text-gray-600',
  ].join(' '),
  ghost: [
    'text-gray-700 dark:text-gray-300',
    'hover:bg-gray-100 dark:hover:bg-gray-800',
    'focus:ring-gray-500',
    'disabled:text-gray-400 dark:disabled:text-gray-600',
  ].join(' '),
  danger: [
    'bg-red-600 text-white',
    'hover:bg-red-700',
    'focus:ring-red-500',
    'disabled:bg-red-300 disabled:cursor-not-allowed',
  ].join(' '),
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm font-medium rounded-md',
  md: 'px-4 py-2 text-sm font-medium rounded-md',
  lg: 'px-6 py-3 text-base font-medium rounded-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        className={twMerge(
          clsx(
            'inline-flex items-center justify-center font-medium',
            'transition-colors duration-200 ease-in-out',
            'focus:outline-none focus:ring-2 focus:ring-offset-2',
            'dark:focus:ring-offset-gray-900',
            variantStyles[variant],
            sizeStyles[size],
            fullWidth && 'w-full',
            isDisabled && 'cursor-not-allowed opacity-60',
            className
          )
        )}
        disabled={isDisabled}
        {...props}
      >
        {isLoading && (
          <svg
            className={clsx('animate-spin', size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4', children || leftIcon || rightIcon ? 'mr-2' : '')}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
        {children}
        {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
