'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react';
import type { Tag, CreateTagDTO, UpdateTagDTO } from '../types';
import * as api from '../services/api';

interface TagContextType {
  // State
  tags: Tag[];
  availableTags: Tag[];
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchTags: () => Promise<void>;
  fetchAvailableTags: (projectId: number) => Promise<void>;
  createTag: (data: CreateTagDTO) => Promise<Tag>;
  updateTag: (id: number, data: UpdateTagDTO) => Promise<Tag>;
  deleteTag: (id: number) => Promise<void>;
  clearError: () => void;
  
  // Helpers
  getTagById: (id: number) => Tag | undefined;
}

const TagContext = createContext<TagContextType | undefined>(undefined);

interface TagProviderProps {
  children: ReactNode;
  projectId?: number | null;
}

export function TagProvider({ children, projectId }: TagProviderProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filter tags available for current project (global + project-specific)
  const availableTags = useMemo(() => {
    if (!projectId) {
      return tags;
    }
    // Return global tags (no project_id) + tags assigned to current project
    return tags.filter(t => t.project_id === undefined || t.project_id === null || t.project_id === projectId);
  }, [tags, projectId]);
  
  // Fetch all tags
  const fetchTags = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await api.getTags();
      setTags(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tags');
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Fetch available tags for a project
  const fetchAvailableTags = useCallback(async (projId: number) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await api.getTags(projId);
      // Merge with existing tags to avoid duplicates
      setTags(prev => {
        const existingIds = new Set(prev.map(t => t.id));
        const newTags = data.filter(t => !existingIds.has(t.id));
        return [...prev, ...newTags];
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tags');
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Create a new tag
  const createTag = useCallback(async (data: CreateTagDTO): Promise<Tag> => {
    setLoading(true);
    setError(null);
    
    try {
      const newTag = await api.createTag(data);
      setTags(prev => [...prev, newTag]);
      return newTag;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create tag';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Update an existing tag
  const updateTag = useCallback(async (id: number, data: UpdateTagDTO): Promise<Tag> => {
    setLoading(true);
    setError(null);
    
    try {
      const updatedTag = await api.updateTag(id, data);
      setTags(prev => 
        prev.map(t => t.id === id ? updatedTag : t)
      );
      return updatedTag;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update tag';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Delete a tag
  const deleteTag = useCallback(async (id: number): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      await api.deleteTag(id);
      setTags(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete tag';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  // Get tag by ID
  const getTagById = useCallback((id: number): Tag | undefined => {
    return tags.find(t => t.id === id);
  }, [tags]);
  
  // Fetch tags on mount
  useEffect(() => {
    fetchTags();
  }, [fetchTags]);
  
  const value: TagContextType = {
    tags,
    availableTags,
    loading,
    error,
    fetchTags,
    fetchAvailableTags,
    createTag,
    updateTag,
    deleteTag,
    clearError,
    getTagById,
  };
  
  return (
    <TagContext.Provider value={value}>
      {children}
    </TagContext.Provider>
  );
}

export function useTags(): TagContextType {
  const context = useContext(TagContext);
  if (context === undefined) {
    throw new Error('useTags must be used within a TagProvider');
  }
  return context;
}

export default TagContext;
