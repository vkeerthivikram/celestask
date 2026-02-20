'use client';

import React, { useState, useEffect } from 'react';
import type { CustomField, CustomFieldType, CreateCustomFieldDTO, UpdateCustomFieldDTO, Project } from '../../types';
import { useProjects } from '../../context/ProjectContext';
import Button from './Button';
import Modal from './Modal';

interface CustomFieldFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateCustomFieldDTO | UpdateCustomFieldDTO) => Promise<void>;
  field?: CustomField | null;
  loading?: boolean;
}

const FIELD_TYPES: { value: CustomFieldType; label: string; description: string }[] = [
  { value: 'text', label: 'Text', description: 'Single line text input' },
  { value: 'number', label: 'Number', description: 'Numeric input' },
  { value: 'date', label: 'Date', description: 'Date picker' },
  { value: 'select', label: 'Select', description: 'Single selection dropdown' },
  { value: 'multiselect', label: 'Multi-Select', description: 'Multiple selection dropdown' },
  { value: 'checkbox', label: 'Checkbox', description: 'Boolean checkbox' },
  { value: 'url', label: 'URL', description: 'URL/link input' },
];

export default function CustomFieldForm({
  isOpen,
  onClose,
  onSubmit,
  field,
  loading = false,
}: CustomFieldFormProps) {
  const { projects } = useProjects();
  const isEditing = !!field;

  const [formData, setFormData] = useState<CreateCustomFieldDTO>({
    name: '',
    field_type: 'text',
    project_id: null,
    options: [],
    required: false,
    sort_order: 0,
  });

  const [newOption, setNewOption] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form when editing
  useEffect(() => {
    if (field) {
      setFormData({
        name: field.name,
        field_type: field.field_type,
        project_id: field.project_id || null,
        options: field.options || [],
        required: field.required,
        sort_order: field.sort_order,
      });
    } else {
      setFormData({
        name: '',
        field_type: 'text',
        project_id: null,
        options: [],
        required: false,
        sort_order: 0,
      });
    }
    setErrors({});
    setNewOption('');
  }, [field, isOpen]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    // Clear error when field is modified
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleAddOption = () => {
    if (newOption.trim()) {
      setFormData(prev => ({
        ...prev,
        options: [...(prev.options || []), newOption.trim()],
      }));
      setNewOption('');
    }
  };

  const handleRemoveOption = (index: number) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options?.filter((_, i) => i !== index),
    }));
  };

  const handleOptionKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddOption();
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Field name is required';
    }

    if (['select', 'multiselect'].includes(formData.field_type)) {
      if (!formData.options || formData.options.length < 1) {
        newErrors.options = 'At least one option is required for select fields';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Failed to save custom field:', error);
    }
  };

  const needsOptions = ['select', 'multiselect'].includes(formData.field_type);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Custom Field' : 'Create Custom Field'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Field Name */}
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Field Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
              errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            }`}
            placeholder="e.g., Priority Level, Estimated Cost"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-500">{errors.name}</p>
          )}
        </div>

        {/* Field Type */}
        <div>
          <label
            htmlFor="field_type"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Field Type <span className="text-red-500">*</span>
          </label>
          <select
            id="field_type"
            name="field_type"
            value={formData.field_type}
            onChange={handleChange}
            disabled={isEditing}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {FIELD_TYPES.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {FIELD_TYPES.find(t => t.value === formData.field_type)?.description}
          </p>
        </div>

        {/* Options for Select/Multi-Select */}
        {needsOptions && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Options <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newOption}
                  onChange={e => setNewOption(e.target.value)}
                  onKeyDown={handleOptionKeyDown}
                  className={`flex-1 px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                    errors.options ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="Add an option"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleAddOption}
                  disabled={!newOption.trim()}
                >
                  Add
                </Button>
              </div>
              {errors.options && (
                <p className="text-sm text-red-500">{errors.options}</p>
              )}
              {formData.options && formData.options.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.options.map((option, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm rounded-md"
                    >
                      {option}
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(index)}
                        className="text-gray-500 hover:text-red-500 focus:outline-none"
                        aria-label={`Remove ${option}`}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Project Scope */}
        <div>
          <label
            htmlFor="project_id"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Project Scope
          </label>
          <select
            id="project_id"
            name="project_id"
            value={formData.project_id || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="">Global (All Projects)</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Global fields are available in all projects
          </p>
        </div>

        {/* Required */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="required"
            name="required"
            checked={formData.required}
            onChange={handleChange}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label
            htmlFor="required"
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Required field
          </label>
        </div>

        {/* Sort Order */}
        <div>
          <label
            htmlFor="sort_order"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Sort Order
          </label>
          <input
            type="number"
            id="sort_order"
            name="sort_order"
            value={formData.sort_order}
            onChange={handleChange}
            min="0"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Lower numbers appear first
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={loading}>
            {isEditing ? 'Update Field' : 'Create Field'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
