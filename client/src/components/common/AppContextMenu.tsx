'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';

export interface AppContextMenuItem {
  id: string;
  label: string;
  onSelect: () => void;
  disabled?: boolean;
  danger?: boolean;
}

interface AppContextMenuProps {
  open: boolean;
  x: number;
  y: number;
  items: AppContextMenuItem[];
  onClose: () => void;
}

export function AppContextMenu({ open, x, y, items, onClose }: AppContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState({ left: x, top: y });
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const handleClose = () => {
      onClose();
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    window.addEventListener('resize', handleClose);
    window.addEventListener('scroll', handleClose, true);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('resize', handleClose);
      window.removeEventListener('scroll', handleClose, true);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const menuWidth = menuRef.current?.offsetWidth ?? 220;
    const menuHeight = menuRef.current?.offsetHeight ?? 0;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const spacing = 8;

    const nextLeft = Math.min(Math.max(x, spacing), Math.max(spacing, viewportWidth - menuWidth - spacing));
    const nextTop = Math.min(Math.max(y, spacing), Math.max(spacing, viewportHeight - menuHeight - spacing));

    setPosition({ left: nextLeft, top: nextTop });
  }, [open, x, y, items.length]);

  const visibleItems = useMemo(() => items.filter(Boolean), [items]);
  const enabledIndices = useMemo(
    () => visibleItems.map((item, index) => (item.disabled ? -1 : index)).filter((index) => index >= 0),
    [visibleItems]
  );

  useEffect(() => {
    if (!open) {
      setActiveIndex(-1);
      return;
    }

    const firstEnabledIndex = enabledIndices[0] ?? -1;
    setActiveIndex(firstEnabledIndex);
  }, [open, enabledIndices]);

  useEffect(() => {
    if (!open || activeIndex < 0) {
      return;
    }

    itemRefs.current[activeIndex]?.focus();
  }, [open, activeIndex]);

  const getNextEnabledIndex = (currentIndex: number, direction: 1 | -1): number => {
    if (enabledIndices.length === 0) {
      return -1;
    }

    const currentEnabledPosition = enabledIndices.indexOf(currentIndex);
    const startPosition = currentEnabledPosition === -1 ? (direction === 1 ? -1 : 0) : currentEnabledPosition;
    const nextPosition = (startPosition + direction + enabledIndices.length) % enabledIndices.length;
    return enabledIndices[nextPosition];
  };

  const handleMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((prev) => getNextEnabledIndex(prev, 1));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((prev) => getNextEnabledIndex(prev, -1));
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      setActiveIndex(enabledIndices[0] ?? -1);
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      setActiveIndex(enabledIndices[enabledIndices.length - 1] ?? -1);
      return;
    }

    if ((event.key === 'Enter' || event.key === ' ') && activeIndex >= 0) {
      event.preventDefault();
      const activeItem = visibleItems[activeIndex];
      if (activeItem && !activeItem.disabled) {
        activeItem.onSelect();
        onClose();
      }
      return;
    }

    if (event.key === 'Tab') {
      onClose();
    }
  };

  if (!open || !mounted || visibleItems.length === 0) {
    return null;
  }

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      tabIndex={-1}
      onKeyDown={handleMenuKeyDown}
      className="fixed z-[100] min-w-[220px] overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800"
      style={{ left: position.left, top: position.top }}
    >
      {visibleItems.map((item) => (
        <button
          key={item.id}
          ref={(element) => {
            itemRefs.current[visibleItems.indexOf(item)] = element;
          }}
          type="button"
          role="menuitem"
          disabled={item.disabled}
          onMouseEnter={() => {
            if (!item.disabled) {
              setActiveIndex(visibleItems.indexOf(item));
            }
          }}
          onClick={() => {
            if (item.disabled) {
              return;
            }
            item.onSelect();
            onClose();
          }}
          className={twMerge(
            clsx(
              'flex w-full items-center px-3 py-2 text-left text-sm transition-colors',
              activeIndex === visibleItems.indexOf(item) && !item.disabled && 'bg-gray-100 dark:bg-gray-700',
              item.disabled
                ? 'cursor-not-allowed text-gray-400 dark:text-gray-500'
                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700',
              item.danger && !item.disabled && 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20'
            )
          )}
        >
          {item.label}
        </button>
      ))}
    </div>,
    document.body
  );
}

export default AppContextMenu;