'use client';

import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { ViewType, ModalState, Task, Project } from '../types';

interface AppContextType {
  // View state
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
  
  // Current project
  currentProjectId: number | null;
  setCurrentProjectId: (id: number | null) => void;
  
  // Sidebar state
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  
  // Modal state
  modal: ModalState;
  openTaskModal: (task?: Task) => void;
  openProjectModal: (project?: Project) => void;
  openConfirmModal: (data: unknown) => void;
  openImportExportModal: () => void;
  closeModal: () => void;
  
  // Theme
  darkMode: boolean;
  toggleDarkMode: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  // Initialize dark mode from localStorage or system preference
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('darkMode');
      if (stored !== null) {
        return JSON.parse(stored);
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });
  
  const [currentView, setCurrentView] = useState<ViewType>('kanban');
  const [currentProjectId, setCurrentProjectId] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    type: null,
    data: null,
  });
  
  // Apply dark mode class to document
  React.useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);
  
  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);
  
  const toggleDarkMode = useCallback(() => {
    setDarkMode(prev => !prev);
  }, []);
  
  const openTaskModal = useCallback((task?: Task) => {
    setModal({
      isOpen: true,
      type: 'task',
      data: task,
    });
  }, []);
  
  const openProjectModal = useCallback((project?: Project) => {
    setModal({
      isOpen: true,
      type: 'project',
      data: project,
    });
  }, []);
  
  const openConfirmModal = useCallback((_data?: unknown) => {
    setModal({
      isOpen: true,
      type: 'confirm',
      data: null,
    });
  }, []);
  
  const openImportExportModal = useCallback(() => {
    setModal({
      isOpen: true,
      type: 'importExport',
      data: null,
    });
  }, []);
  
  const closeModal = useCallback(() => {
    setModal({
      isOpen: false,
      type: null,
      data: null,
    });
  }, []);
  
  const value: AppContextType = {
    currentView,
    setCurrentView,
    currentProjectId,
    setCurrentProjectId,
    sidebarOpen,
    toggleSidebar,
    setSidebarOpen,
    modal,
    openTaskModal,
    openProjectModal,
    openConfirmModal,
    openImportExportModal,
    closeModal,
    darkMode,
    toggleDarkMode,
  };
  
  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextType {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

export default AppContext;
