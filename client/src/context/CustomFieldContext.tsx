'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react';
import type {
  CustomField,
  CustomFieldValue,
  CreateCustomFieldDTO,
  UpdateCustomFieldDTO,
  SetCustomFieldValueDTO,
} from '../types';
import * as api from '../services/api';

interface CustomFieldContextType {
  // State
  customFields: CustomField[];
  availableFields: CustomField[];
  taskFieldValues: Map<string, CustomFieldValue[]>; // taskId -> field values
  loading: boolean;
  error: string | null;

  // Custom Field Definition Actions
  fetchCustomFields: (projectId?: string) => Promise<void>;
  createCustomField: (data: CreateCustomFieldDTO) => Promise<CustomField>;
  updateCustomField: (id: string, data: Partial<UpdateCustomFieldDTO>) => Promise<CustomField>;
  deleteCustomField: (id: string) => Promise<void>;

  // Custom Field Value Actions
  fetchTaskCustomFields: (taskId: number) => Promise<void>;
  setTaskCustomField: (taskId: number, fieldId: string, value: SetCustomFieldValueDTO['value']) => Promise<CustomFieldValue>;
  deleteTaskCustomField: (taskId: number, fieldId: string) => Promise<void>;
  clearTaskFieldValues: (taskId: number) => void;

  // Helpers
  getCustomFieldById: (id: string) => CustomField | undefined;
  getTaskFieldValue: (taskId: number, fieldId: string) => CustomFieldValue | undefined;
  clearError: () => void;
}

const CustomFieldContext = createContext<CustomFieldContextType | undefined>(undefined);

interface CustomFieldProviderProps {
  children: ReactNode;
  projectId?: string | null;
}

export function CustomFieldProvider({ children, projectId }: CustomFieldProviderProps) {
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [taskFieldValues, setTaskFieldValues] = useState<Map<string, CustomFieldValue[]>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter fields available for current project (global + project-specific)
  const availableFields = useMemo(() => {
    if (!projectId) {
      return customFields.filter(f => !f.project_id);
    }
    // Return global fields (no project_id) + fields assigned to current project
    return customFields.filter(
      f => !f.project_id || f.project_id === null || f.project_id === projectId
    );
  }, [customFields, projectId]);

  // Fetch all custom fields
  const fetchCustomFields = useCallback(async (projId?: string) => {
    setLoading(true);
    setError(null);

    try {
      const data = await api.getCustomFields(projId);
      setCustomFields(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch custom fields');
    } finally {
      setLoading(false);
    }
  }, []);

  // Create a new custom field
  const createCustomField = useCallback(async (data: CreateCustomFieldDTO): Promise<CustomField> => {
    setLoading(true);
    setError(null);

    try {
      const newField = await api.createCustomField(data);
      setCustomFields(prev => [...prev, newField]);
      return newField;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create custom field';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Update an existing custom field
  const updateCustomField = useCallback(async (id: string, data: Partial<UpdateCustomFieldDTO>): Promise<CustomField> => {
    setLoading(true);
    setError(null);

    try {
      const updatedField = await api.updateCustomField(id, data);
      setCustomFields(prev =>
        prev.map(f => f.id === id ? updatedField : f)
      );
      return updatedField;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update custom field';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete a custom field
  const deleteCustomField = useCallback(async (id: string): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      await api.deleteCustomField(id);
      setCustomFields(prev => prev.filter(f => f.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete custom field';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch custom field values for a task
  const fetchTaskCustomFields = useCallback(async (taskId: number) => {
    setLoading(true);
    setError(null);

    try {
      const data = await api.getTaskCustomFields(taskId);
      setTaskFieldValues(prev => {
        const newMap = new Map(prev);
        newMap.set(taskId.toString(), data);
        return newMap;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch task custom fields');
    } finally {
      setLoading(false);
    }
  }, []);

  // Set a custom field value for a task
  const setTaskCustomField = useCallback(async (
    taskId: number,
    fieldId: string,
    value: SetCustomFieldValueDTO['value']
  ): Promise<CustomFieldValue> => {
    setLoading(true);
    setError(null);

    try {
      const fieldValue = await api.setTaskCustomField(taskId, fieldId, value);
      setTaskFieldValues(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(taskId.toString()) || [];
        const index = existing.findIndex(fv => fv.custom_field_id === fieldId);
        if (index >= 0) {
          const updated = [...existing];
          updated[index] = fieldValue;
          newMap.set(taskId.toString(), updated);
        } else {
          newMap.set(taskId.toString(), [...existing, fieldValue]);
        }
        return newMap;
      });
      return fieldValue;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to set custom field value';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete a custom field value for a task
  const deleteTaskCustomField = useCallback(async (taskId: number, fieldId: string): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      await api.deleteTaskCustomField(taskId, fieldId);
      setTaskFieldValues(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(taskId.toString()) || [];
        newMap.set(taskId.toString(), existing.filter(fv => fv.custom_field_id !== fieldId));
        return newMap;
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete custom field value';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Clear task field values from cache
  const clearTaskFieldValues = useCallback((taskId: number) => {
    setTaskFieldValues(prev => {
      const newMap = new Map(prev);
      newMap.delete(taskId.toString());
      return newMap;
    });
  }, []);

  // Get custom field by ID
  const getCustomFieldById = useCallback((id: string): CustomField | undefined => {
    return customFields.find(f => f.id === id);
  }, [customFields]);

  // Get task field value
  const getTaskFieldValue = useCallback((taskId: number, fieldId: string): CustomFieldValue | undefined => {
    const values = taskFieldValues.get(taskId.toString());
    return values?.find(fv => fv.custom_field_id === fieldId);
  }, [taskFieldValues]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Fetch custom fields on mount
  useEffect(() => {
    fetchCustomFields(projectId || undefined);
  }, [fetchCustomFields, projectId]);

  const value: CustomFieldContextType = {
    customFields,
    availableFields,
    taskFieldValues,
    loading,
    error,
    fetchCustomFields,
    createCustomField,
    updateCustomField,
    deleteCustomField,
    fetchTaskCustomFields,
    setTaskCustomField,
    deleteTaskCustomField,
    clearTaskFieldValues,
    getCustomFieldById,
    getTaskFieldValue,
    clearError,
  };

  return (
    <CustomFieldContext.Provider value={value}>
      {children}
    </CustomFieldContext.Provider>
  );
}

export function useCustomFields(): CustomFieldContextType {
  const context = useContext(CustomFieldContext);
  if (context === undefined) {
    throw new Error('useCustomFields must be used within a CustomFieldProvider');
  }
  return context;
}

export default CustomFieldContext;
