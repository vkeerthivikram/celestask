'use client';

import React, { useState, useEffect, useMemo, type FormEvent } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { FolderPlus, GitBranch, UserCircle } from 'lucide-react';
import type { Project, CreateProjectDTO, UpdateProjectDTO } from '../../types';
import { PROJECT_COLORS } from '../../types';
import { Button } from './Button';
import { useProjects } from '../../context/ProjectContext';
import { usePeople } from '../../context/PeopleContext';

interface ProjectFormProps {
  project?: Project | null;
  parentProjectId?: number | null;
  onSubmit: (data: CreateProjectDTO | UpdateProjectDTO) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

interface FormData {
  name: string;
  description: string;
  color: string;
  parent_project_id: number | null;
  owner_id: number | null;
}

interface FormErrors {
  name?: string;
  description?: string;
}

export function ProjectForm({
  project,
  parentProjectId: propParentProjectId,
  onSubmit,
  onCancel,
  isLoading = false,
}: ProjectFormProps) {
  const isEditing = Boolean(project);
  const { projects } = useProjects();
  const { people } = usePeople();
  
  // Get available parent projects (exclude self and descendants)
  const availableParentProjects = useMemo(() => {
    return projects.filter(p => p.id !== project?.id);
  }, [projects, project?.id]);
  
  const [formData, setFormData] = useState<FormData>({
    name: project?.name || '',
    description: project?.description || '',
    color: project?.color || PROJECT_COLORS[0],
    parent_project_id: project?.parent_project_id || propParentProjectId || null,
    owner_id: project?.owner_id || null,
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  
  // Update form when project changes
  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name,
        description: project.description,
        color: project.color,
        parent_project_id: project.parent_project_id || null,
        owner_id: project.owner_id || null,
      });
    }
  }, [project]);
  
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Project name is required';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Project name must be less than 100 characters';
    }
    
    if (formData.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      if (isEditing && project) {
        await onSubmit({
          name: formData.name.trim(),
          description: formData.description.trim(),
          color: formData.color,
          parent_project_id: formData.parent_project_id,
          owner_id: formData.owner_id,
        } as UpdateProjectDTO);
      } else {
        await onSubmit({
          name: formData.name.trim(),
          description: formData.description.trim(),
          color: formData.color,
          parent_project_id: formData.parent_project_id || undefined,
          owner_id: formData.owner_id || undefined,
        } as CreateProjectDTO);
      }
    } catch {
      // Error handling is done by the parent component
    }
  };
  
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    
    if (name === 'parent_project_id' || name === 'owner_id') {
      setFormData(prev => ({ 
        ...prev, 
        [name]: value ? Number(value) : null 
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };
  
  // Get parent project name for display
  const parentProject = useMemo(() => {
    if (!formData.parent_project_id) return null;
    return projects.find(p => p.id === formData.parent_project_id);
  }, [projects, formData.parent_project_id]);
  
  // Get owner for display
  const selectedOwner = useMemo(() => {
    if (!formData.owner_id) return null;
    return people.find(p => p.id === formData.owner_id);
  }, [people, formData.owner_id]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Parent Project Selection */}
      {availableParentProjects.length > 0 && (
        <div>
          <label
            htmlFor="parent_project_id"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            <GitBranch className="w-4 h-4 inline-block mr-1" />
            Parent Project
          </label>
          <select
            id="parent_project_id"
            name="parent_project_id"
            value={formData.parent_project_id || ''}
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
            <option value="">No parent project (top-level)</option>
            {availableParentProjects.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {parentProject && (
            <div className="mt-2 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: parentProject.color }}
              />
              <span>Sub-project of: {parentProject.name}</span>
            </div>
          )}
        </div>
      )}
      
      {/* Project Owner Selection */}
      <div>
        <label
          htmlFor="owner_id"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          <UserCircle className="w-4 h-4 inline-block mr-1" />
          Project Owner
        </label>
        <select
          id="owner_id"
          name="owner_id"
          value={formData.owner_id || ''}
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
          <option value="">No owner</option>
          {people.map(p => (
            <option key={p.id} value={p.id}>
              {p.name}{p.company ? ` (${p.company})` : ''}
            </option>
          ))}
        </select>
        {selectedOwner && (
          <div className="mt-2 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <div className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
              <span className="text-xs font-medium text-primary-600 dark:text-primary-400">
                {selectedOwner.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <span>Owner: {selectedOwner.name}</span>
          </div>
        )}
      </div>
      
      {/* Project Name */}
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Project Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          placeholder="Enter project name"
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
      
      {/* Description */}
      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Description
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          placeholder="Enter project description (optional)"
          rows={3}
          className={twMerge(
            clsx(
              'w-full px-3 py-2 rounded-md border shadow-sm resize-none',
              'bg-white dark:bg-gray-900',
              'text-gray-900 dark:text-gray-100',
              'placeholder-gray-400 dark:placeholder-gray-500',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
              errors.description
                ? 'border-red-500 dark:border-red-400'
                : 'border-gray-300 dark:border-gray-600'
            )
          )}
          disabled={isLoading}
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-500 dark:text-red-400">{errors.description}</p>
        )}
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {formData.description.length}/500 characters
        </p>
      </div>
      
      {/* Color Picker */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Color
        </label>
        <div className="flex flex-wrap gap-2">
          {PROJECT_COLORS.map((color) => (
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
      
      {/* Color Preview */}
      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: formData.color }}
        >
          <FolderPlus className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
            {formData.name || 'Project Name'}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
            {formData.description || 'No description'}
          </p>
          <div className="flex items-center gap-3 mt-1">
            {formData.parent_project_id && parentProject && (
              <p className="text-xs text-gray-400 dark:text-gray-500">
                <GitBranch className="w-3 h-3 inline-block mr-1" />
                Sub-project of {parentProject.name}
              </p>
            )}
            {selectedOwner && (
              <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                <UserCircle className="w-3 h-3 inline-block" />
                Owner: {selectedOwner.name}
              </p>
            )}
          </div>
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
          leftIcon={isLoading ? undefined : <FolderPlus className="w-4 h-4" />}
        >
          {isEditing ? 'Update Project' : 'Create Project'}
        </Button>
      </div>
    </form>
  );
}

export default ProjectForm;
