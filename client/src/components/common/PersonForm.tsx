import React, { useState, useEffect, type FormEvent } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { User, Mail, Building, Briefcase, Folder, Loader2 } from 'lucide-react';
import type { Person, Project, CreatePersonDTO, UpdatePersonDTO } from '../../types';
import { Button } from './Button';

interface PersonFormProps {
  person?: Person | null;
  projects?: Project[];
  projectId?: number;
  onSubmit: (data: CreatePersonDTO | UpdatePersonDTO) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

interface FormData {
  name: string;
  email: string;
  company: string;
  designation: string;
  project_id: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  company?: string;
  designation?: string;
}

export function PersonForm({
  person,
  projects = [],
  projectId: propProjectId,
  onSubmit,
  onCancel,
  isLoading = false,
}: PersonFormProps) {
  const isEditing = Boolean(person);
  
  const [formData, setFormData] = useState<FormData>({
    name: person?.name || '',
    email: person?.email || '',
    company: person?.company || '',
    designation: person?.designation || '',
    project_id: person?.project_id?.toString() || propProjectId?.toString() || '',
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  
  // Update form when person changes
  useEffect(() => {
    if (person) {
      setFormData({
        name: person.name,
        email: person.email || '',
        company: person.company || '',
        designation: person.designation || '',
        project_id: person.project_id?.toString() || '',
      });
    }
  }, [person]);
  
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Name must be less than 100 characters';
    }
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (formData.company && formData.company.length > 100) {
      newErrors.company = 'Company name must be less than 100 characters';
    }
    
    if (formData.designation && formData.designation.length > 100) {
      newErrors.designation = 'Designation must be less than 100 characters';
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
        email: formData.email.trim() || undefined,
        company: formData.company.trim() || undefined,
        designation: formData.designation.trim() || undefined,
        project_id: formData.project_id ? parseInt(formData.project_id, 10) : undefined,
      };
      
      if (isEditing) {
        await onSubmit(data as UpdatePersonDTO);
      } else {
        await onSubmit(data as CreatePersonDTO);
      }
    } catch {
      // Error handling is done by the parent component
    }
  };
  
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
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
      {/* Name */}
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          <User className="w-4 h-4 inline-block mr-1" />
          Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          placeholder="Enter person's name"
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
      
      {/* Email */}
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          <Mail className="w-4 h-4 inline-block mr-1" />
          Email
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleInputChange}
          placeholder="Enter email address (optional)"
          className={twMerge(
            clsx(
              'w-full px-3 py-2 rounded-md border shadow-sm',
              'bg-white dark:bg-gray-900',
              'text-gray-900 dark:text-gray-100',
              'placeholder-gray-400 dark:placeholder-gray-500',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
              errors.email
                ? 'border-red-500 dark:border-red-400'
                : 'border-gray-300 dark:border-gray-600'
            )
          )}
          disabled={isLoading}
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-500 dark:text-red-400">{errors.email}</p>
        )}
      </div>
      
      {/* Company and Designation Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Company */}
        <div>
          <label
            htmlFor="company"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            <Building className="w-4 h-4 inline-block mr-1" />
            Company
          </label>
          <input
            type="text"
            id="company"
            name="company"
            value={formData.company}
            onChange={handleInputChange}
            placeholder="Company name (optional)"
            className={twMerge(
              clsx(
                'w-full px-3 py-2 rounded-md border shadow-sm',
                'bg-white dark:bg-gray-900',
                'text-gray-900 dark:text-gray-100',
                'placeholder-gray-400 dark:placeholder-gray-500',
                'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
                errors.company
                  ? 'border-red-500 dark:border-red-400'
                  : 'border-gray-300 dark:border-gray-600'
              )
            )}
            disabled={isLoading}
          />
          {errors.company && (
            <p className="mt-1 text-sm text-red-500 dark:text-red-400">{errors.company}</p>
          )}
        </div>
        
        {/* Designation */}
        <div>
          <label
            htmlFor="designation"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            <Briefcase className="w-4 h-4 inline-block mr-1" />
            Designation
          </label>
          <input
            type="text"
            id="designation"
            name="designation"
            value={formData.designation}
            onChange={handleInputChange}
            placeholder="Job title (optional)"
            className={twMerge(
              clsx(
                'w-full px-3 py-2 rounded-md border shadow-sm',
                'bg-white dark:bg-gray-900',
                'text-gray-900 dark:text-gray-100',
                'placeholder-gray-400 dark:placeholder-gray-500',
                'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
                errors.designation
                  ? 'border-red-500 dark:border-red-400'
                  : 'border-gray-300 dark:border-gray-600'
              )
            )}
            disabled={isLoading}
          />
          {errors.designation && (
            <p className="mt-1 text-sm text-red-500 dark:text-red-400">{errors.designation}</p>
          )}
        </div>
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
            Select a project to make this person available only for that project, or leave as Global.
          </p>
        </div>
      )}
      
      {/* Preview Card */}
      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
        <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
          <span className="text-primary-600 dark:text-primary-400 font-semibold text-sm">
            {formData.name ? formData.name.charAt(0).toUpperCase() : '?'}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
            {formData.name || 'Person Name'}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
            {formData.designation 
              ? (formData.company ? `${formData.designation} at ${formData.company}` : formData.designation)
              : (formData.company || 'No details')}
          </p>
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
          leftIcon={isLoading ? undefined : <User className="w-4 h-4" />}
        >
          {isEditing ? 'Update Person' : 'Add Person'}
        </Button>
      </div>
    </form>
  );
}

export default PersonForm;
