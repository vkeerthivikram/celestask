'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { Note, CreateNoteDTO, UpdateNoteDTO, NoteEntityType } from '../types';
import * as api from '../services/api';

interface NoteContextType {
  notes: Note[];
  loading: boolean;
  error: string | null;
  currentEntity: { type: NoteEntityType; id: number } | null;
  fetchNotes: (entityType: NoteEntityType, entityId: number) => Promise<void>;
  createNote: (data: CreateNoteDTO) => Promise<Note>;
  updateNote: (id: number, data: UpdateNoteDTO) => Promise<Note>;
  deleteNote: (id: number) => Promise<void>;
  clearNotes: () => void;
}

const NoteContext = createContext<NoteContextType | undefined>(undefined);

interface NoteProviderProps {
  children: ReactNode;
}

export function NoteProvider({ children }: NoteProviderProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentEntity, setCurrentEntity] = useState<{ type: NoteEntityType; id: number } | null>(null);

  const fetchNotes = useCallback(async (entityType: NoteEntityType, entityId: number) => {
    setLoading(true);
    setError(null);
    setCurrentEntity({ type: entityType, id: entityId });
    try {
      const data = await api.getNotes(entityType, entityId);
      setNotes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch notes');
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const createNote = useCallback(async (data: CreateNoteDTO): Promise<Note> => {
    setLoading(true);
    setError(null);
    try {
      const newNote = await api.createNote(data);
      setNotes((prev) => [...prev, newNote]);
      return newNote;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create note';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateNote = useCallback(async (id: number, data: UpdateNoteDTO): Promise<Note> => {
    setLoading(true);
    setError(null);
    try {
      const updatedNote = await api.updateNote(id, data);
      setNotes((prev) =>
        prev.map((note) => (note.id === id ? updatedNote : note))
      );
      return updatedNote;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update note';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteNote = useCallback(async (id: number): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await api.deleteNote(id);
      setNotes((prev) => prev.filter((note) => note.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete note';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearNotes = useCallback(() => {
    setNotes([]);
    setCurrentEntity(null);
    setError(null);
  }, []);

  const value: NoteContextType = {
    notes,
    loading,
    error,
    currentEntity,
    fetchNotes,
    createNote,
    updateNote,
    deleteNote,
    clearNotes,
  };

  return <NoteContext.Provider value={value}>{children}</NoteContext.Provider>;
}

export function useNotes(): NoteContextType {
  const context = useContext(NoteContext);
  if (context === undefined) {
    throw new Error('useNotes must be used within a NoteProvider');
  }
  return context;
}

export default NoteContext;
