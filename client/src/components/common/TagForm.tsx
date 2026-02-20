'use client';

import React, { useState, useEffect, type FormEvent } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Tag as TagIcon, Folder, Loader2 } from 'lucide-react';
import type { Tag, Project, CreateTagDTO, UpdateTagDTO } from '../../types';
import { PROJECT_COLORS } from '../../types';
import { Button } from './Button';

// Predefined tag colors (distinct from project colors)
export const TAG_COLORS = [
  '#EF4444', // Red
  '#F97316', // Orange
  '#EAB308', // Yellow
  '#22C55E', // Green
  '#14B8A6', // Teal
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#6366F1', // Indigo
  '#64748B', // Slate
];

interface TagFormProps {
  tag?: Tag | null;
  projects?: Project[];
  projectId?: number;
  onSubmit: (data: CreateTagDTO | UpdateTagDTO) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

interface FormData {
  name: string;
  color: string;
  project_id: string;
}

interface FormErrors {
  name?: string;
  color?: string;
}

export function TagForm({
  tag,
  projects = [],
  projectId: propProjectId,
  onSubmit,
  onCancel,
  isLoading = false,
}: TagFormProps) {
  const isEditing = Boolean(tag);
  
  const [formData, setFormData] = useState<FormData>({
    name: tag?.name || '',
    color: tag?.color || TAG_COLORS[0],
    project_id: tag?.project_id?.toString() || propProjectId?.toString() || '',
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  
  // Update form when tag changes
  useEffect(() => {
    if (tag) {
      setFormData({
        name: tag.name,
        color: tag.color,
        project_id: tag.project_id?.toString() || '',
      });
    }
  }, [tag]);
  
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Tag name is required';
    } else if (formData.name.length > 50) {
      newErrors.name = 'Tag name must be less than 50 characters';
    }
    
    if (!formData.color) {
      newErrors.color = 'Color is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      const data = {
        name: formData.name.trim(),
        color: formData.color,
        project_id: formData.project_id ? parseInt(formData.project_id, 10) : undefined,
      };
      
      if (isEditing) {
        await onSubmit(data as UpdateTagDTO);
      } else {
        await onSubmit(data as CreateTagDTO);
      }
    } catch {
      // Error handling is done by the parent component
    }
  };
  
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Tag Name */}
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          <TagIcon className="w-4 h-4 inline-block mr-1" />
          Tag Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          placeholder="Enter tag name"
          className={twMerge(
            clsx(
              'w-full px-3 py-2 rounded-md border shadow-sm',
              'bg-white dark:bg-gray-900',
              'text-gray-900 dark:text-gray-100',
              'placeholder-gray-400 dark:placeholder-gray-500',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
              errors.name
                ? 'border-red-500 dark:border-red-400'
                : 'border-gray-300 dark:border-gray-600'
            )
          )}
          disabled={isLoading}
          autoFocus
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-500 dark:text-red-400">{errors.name}</p>
        )}
      </div>
      
      {/* Color Picker */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Color
        </label>
        <div className="flex flex-wrap gap-2">
          {TAG_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, color }))}
              className={twMerge(
                clsx(
                  'w-8 h-8 rounded-full transition-all duration-200',
                  'hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2',
                  'dark:focus:ring-offset-gray-800',
                  formData.color === color && 'ring-2 ring-offset-2 ring-gray-400'
                )
              )}
              style={{ backgroundColor: color }}
              aria-label={`Select color ${color}`}
              disabled={isLoading}
            />
          ))}
        </div>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Selected: <span className="font-mono">{formData.color}</span>
        </p>
      </div>
      
      {/* Project Assignment */}
      {projects.length > 0 && (
        <div>
          <label
            htmlFor="project_id"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            <Folder className="w-4 h-4 inline-block mr-1" />
            Project Assignment
          </label>
          <select
            id="project_id"
            name="project_id"
            value={formData.project_id}
            onChange={handleInputChange}
            className={twMerge(
              clsx(
                'w-full px-3 py-2 rounded-md border shadow-sm',
                'bg-white dark:bg-gray-900',
                'text-gray-900 dark:text-gray-100',
                'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
                'border-gray-300 dark:border-gray-600'
              )
            )}
            disabled={isLoading}
          >
            <option value="">Global (All Projects)</option>
            {projects.map(project => (
              <option key={project.id} value={project.id.toString()}>
                {project.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Select a project to make this tag available only for that project, or leave as Global.
          </p>
        </div>
      )}
      
      {/* Preview */}
      <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Preview:</p>
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
            style={{ backgroundColor: formData.color }}
          >
            {formData.name || 'Tag Name'}
          </span>
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          isLoading={isLoading}
          leftIcon={isLoading ? undefined : <TagIcon className="w-4 h-4" />}
        >
          {isEditing ? 'Update Tag' : 'Create Tag'}
        </Button>
      </div>
    </form>
  );
}

export default TagForm;
