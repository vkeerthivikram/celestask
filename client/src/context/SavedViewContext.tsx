import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react';
import type { SavedView, CreateSavedViewDTO, UpdateSavedViewDTO, TaskFilters } from '../types';
import * as api from '../services/api';

interface SavedViewContextType {
  // State
  savedViews: SavedView[];
  defaultView: SavedView | null;
  loading: boolean;
  error: string | null;

  // Actions
  fetchSavedViews: (projectId?: string, viewType?: string) => Promise<void>;
  createSavedView: (data: CreateSavedViewDTO) => Promise<SavedView>;
  updateSavedView: (id: string, data: Partial<UpdateSavedViewDTO>) => Promise<SavedView>;
  deleteSavedView: (id: string) => Promise<void>;
  setDefaultView: (id: string) => Promise<SavedView>;

  // Helpers
  getSavedViewById: (id: string) => SavedView | undefined;
  getViewsForType: (viewType: string) => SavedView[];
  applySavedView: (view: SavedView) => AppliedViewData;
  clearError: () => void;
}

interface AppliedViewData {
  filters: TaskFilters;
  sortBy?: string;
  sortOrder: 'asc' | 'desc';
}

const SavedViewContext = createContext<SavedViewContextType | undefined>(undefined);

interface SavedViewProviderProps {
  children: ReactNode;
  projectId?: string | null;
  viewType?: string;
  onApplyView?: (data: AppliedViewData) => void;
}

export function SavedViewProvider({ children, projectId, viewType, onApplyView }: SavedViewProviderProps) {
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get default view for current context
  const defaultView = useMemo(() => {
    const filtered = savedViews.filter(v => {
      const matchesProject = !projectId || !v.project_id || v.project_id === projectId;
      const matchesType = !viewType || v.view_type === viewType;
      return matchesProject && matchesType && v.is_default;
    });
    return filtered[0] || null;
  }, [savedViews, projectId, viewType]);

  // Fetch saved views
  const fetchSavedViews = useCallback(async (projId?: string, vType?: string) => {
    setLoading(true);
    setError(null);

    try {
      const data = await api.getSavedViews(projId, vType);
      setSavedViews(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch saved views');
    } finally {
      setLoading(false);
    }
  }, []);

  // Create a new saved view
  const createSavedView = useCallback(async (data: CreateSavedViewDTO): Promise<SavedView> => {
    setLoading(true);
    setError(null);

    try {
      const newView = await api.createSavedView(data);
      setSavedViews(prev => [...prev, newView]);
      return newView;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create saved view';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Update an existing saved view
  const updateSavedView = useCallback(async (id: string, data: Partial<UpdateSavedViewDTO>): Promise<SavedView> => {
    setLoading(true);
    setError(null);

    try {
      const updatedView = await api.updateSavedView(id, data);
      setSavedViews(prev =>
        prev.map(v => v.id === id ? updatedView : v)
      );
      return updatedView;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update saved view';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete a saved view
  const deleteSavedView = useCallback(async (id: string): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      await api.deleteSavedView(id);
      setSavedViews(prev => prev.filter(v => v.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete saved view';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Set a view as default
  const setDefaultView = useCallback(async (id: string): Promise<SavedView> => {
    setLoading(true);
    setError(null);

    try {
      const updatedView = await api.setDefaultView(id);
      // Update the views - set is_default to false for all others
      setSavedViews(prev =>
        prev.map(v => ({
          ...v,
          is_default: v.id === id,
        }))
      );
      return updatedView;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to set default view';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Get saved view by ID
  const getSavedViewById = useCallback((id: string): SavedView | undefined => {
    return savedViews.find(v => v.id === id);
  }, [savedViews]);

  // Get views for a specific type
  const getViewsForType = useCallback((vType: string): SavedView[] => {
    return savedViews.filter(v => {
      const matchesProject = !projectId || !v.project_id || v.project_id === projectId;
      return v.view_type === vType && matchesProject;
    });
  }, [savedViews, projectId]);

  // Apply a saved view
  const applySavedView = useCallback((view: SavedView): AppliedViewData => {
    const data: AppliedViewData = {
      filters: view.filters,
      sortBy: view.sort_by,
      sortOrder: view.sort_order,
    };

    if (onApplyView) {
      onApplyView(data);
    }

    return data;
  }, [onApplyView]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Fetch saved views on mount or when context changes
  useEffect(() => {
    fetchSavedViews(projectId || undefined, viewType);
  }, [fetchSavedViews, projectId, viewType]);

  const value: SavedViewContextType = {
    savedViews,
    defaultView,
    loading,
    error,
    fetchSavedViews,
    createSavedView,
    updateSavedView,
    deleteSavedView,
    setDefaultView,
    getSavedViewById,
    getViewsForType,
    applySavedView,
    clearError,
  };

  return (
    <SavedViewContext.Provider value={value}>
      {children}
    </SavedViewContext.Provider>
  );
}

export function useSavedViews(): SavedViewContextType {
  const context = useContext(SavedViewContext);
  if (context === undefined) {
    throw new Error('useSavedViews must be used within a SavedViewProvider');
  }
  return context;
}

export default SavedViewContext;
