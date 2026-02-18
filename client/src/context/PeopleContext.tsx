import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react';
import type { Person, CreatePersonDTO, UpdatePersonDTO } from '../types';
import * as api from '../services/api';

interface PeopleContextType {
  // State
  people: Person[];
  projectPeople: Person[];
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchPeople: () => Promise<void>;
  fetchPeopleByProject: (projectId: number) => Promise<void>;
  createPerson: (data: CreatePersonDTO) => Promise<Person>;
  updatePerson: (id: number, data: UpdatePersonDTO) => Promise<Person>;
  deletePerson: (id: number) => Promise<void>;
  clearError: () => void;
  
  // Helpers
  getPersonById: (id: number) => Person | undefined;
}

const PeopleContext = createContext<PeopleContextType | undefined>(undefined);

interface PeopleProviderProps {
  children: ReactNode;
  projectId?: number | null;
}

export function PeopleProvider({ children, projectId }: PeopleProviderProps) {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filter people by current project
  const projectPeople = useMemo(() => {
    if (!projectId) {
      // Return all people (global + current project's people)
      return people;
    }
    // Return global people (no project_id) + people assigned to current project
    return people.filter(p => p.project_id === undefined || p.project_id === null || p.project_id === projectId);
  }, [people, projectId]);
  
  // Fetch all people
  const fetchPeople = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await api.getPeople();
      setPeople(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch people');
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Fetch people by project
  const fetchPeopleByProject = useCallback(async (projId: number) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await api.getPeople(projId);
      // Merge with existing people to avoid duplicates
      setPeople(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const newPeople = data.filter(p => !existingIds.has(p.id));
        return [...prev, ...newPeople];
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch people');
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Create a new person
  const createPerson = useCallback(async (data: CreatePersonDTO): Promise<Person> => {
    setLoading(true);
    setError(null);
    
    try {
      const newPerson = await api.createPerson(data);
      setPeople(prev => [...prev, newPerson]);
      return newPerson;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create person';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Update an existing person
  const updatePerson = useCallback(async (id: number, data: UpdatePersonDTO): Promise<Person> => {
    setLoading(true);
    setError(null);
    
    try {
      const updatedPerson = await api.updatePerson(id, data);
      setPeople(prev => 
        prev.map(p => p.id === id ? updatedPerson : p)
      );
      return updatedPerson;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update person';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Delete a person
  const deletePerson = useCallback(async (id: number): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      await api.deletePerson(id);
      setPeople(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete person';
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
  
  // Get person by ID
  const getPersonById = useCallback((id: number): Person | undefined => {
    return people.find(p => p.id === id);
  }, [people]);
  
  // Fetch people on mount
  useEffect(() => {
    fetchPeople();
  }, [fetchPeople]);
  
  const value: PeopleContextType = {
    people,
    projectPeople,
    loading,
    error,
    fetchPeople,
    fetchPeopleByProject,
    createPerson,
    updatePerson,
    deletePerson,
    clearError,
    getPersonById,
  };
  
  return (
    <PeopleContext.Provider value={value}>
      {children}
    </PeopleContext.Provider>
  );
}

export function usePeople(): PeopleContextType {
  const context = useContext(PeopleContext);
  if (context === undefined) {
    throw new Error('usePeople must be used within a PeopleProvider');
  }
  return context;
}

export default PeopleContext;
