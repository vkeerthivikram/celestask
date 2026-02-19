import React, { useState, useRef, useEffect } from 'react';
import type { CustomField, CustomFieldValue } from '../../types';

interface CustomFieldInputProps {
  field: CustomField;
  value?: CustomFieldValue['value'];
  onChange: (fieldId: string, value: CustomFieldValue['value']) => void;
  disabled?: boolean;
  error?: string;
}

export default function CustomFieldInput({
  field,
  value,
  onChange,
  disabled = false,
  error,
}: CustomFieldInputProps) {
  const inputId = `custom-field-${field.id}`;
  const baseInputClasses = `w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
    error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
  } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`;

  const handleChange = (newValue: CustomFieldValue['value']) => {
    onChange(field.id, newValue);
  };

  // Render appropriate input based on field type
  switch (field.field_type) {
    case 'text':
      return (
        <div>
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            {field.name}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <input
            type="text"
            id={inputId}
            value={(value as string) || ''}
            onChange={e => handleChange(e.target.value || null)}
            disabled={disabled}
            className={baseInputClasses}
            placeholder={`Enter ${field.name.toLowerCase()}`}
            required={field.required}
          />
          {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
        </div>
      );

    case 'number':
      return (
        <div>
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            {field.name}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <input
            type="number"
            id={inputId}
            value={(value as number) ?? ''}
            onChange={e => {
              const val = e.target.value;
              handleChange(val ? parseFloat(val) : null);
            }}
            disabled={disabled}
            className={baseInputClasses}
            placeholder={`Enter ${field.name.toLowerCase()}`}
            required={field.required}
            step="any"
          />
          {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
        </div>
      );

    case 'date':
      return (
        <div>
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            {field.name}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <input
            type="date"
            id={inputId}
            value={(value as string) || ''}
            onChange={e => handleChange(e.target.value || null)}
            disabled={disabled}
            className={baseInputClasses}
            required={field.required}
          />
          {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
        </div>
      );

    case 'select':
      return (
        <div>
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            {field.name}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <select
            id={inputId}
            value={(value as string) || ''}
            onChange={e => handleChange(e.target.value || null)}
            disabled={disabled}
            className={baseInputClasses}
            required={field.required}
          >
            <option value="">Select {field.name.toLowerCase()}...</option>
            {field.options?.map((option, index) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </select>
          {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
        </div>
      );

    case 'multiselect':
      return (
        <MultiSelectInput
          field={field}
          value={value as string[] | null}
          onChange={handleChange}
          disabled={disabled}
          error={error}
          inputId={inputId}
        />
      );

    case 'checkbox':
      return (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id={inputId}
            checked={Boolean(value)}
            onChange={e => handleChange(e.target.checked)}
            disabled={disabled}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            required={field.required}
          />
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {field.name}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      );

    case 'url':
      return (
        <div>
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            {field.name}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <input
            type="url"
            id={inputId}
            value={(value as string) || ''}
            onChange={e => handleChange(e.target.value || null)}
            disabled={disabled}
            className={baseInputClasses}
            placeholder="https://example.com"
            required={field.required}
          />
          {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
        </div>
      );

    default:
      return (
        <div className="text-sm text-gray-500">
          Unknown field type: {field.field_type}
        </div>
      );
  }
}

// Multi-select component with dropdown
interface MultiSelectInputProps {
  field: CustomField;
  value: string[] | null;
  onChange: (value: string[] | null) => void;
  disabled: boolean;
  error?: string;
  inputId: string;
}

function MultiSelectInput({
  field,
  value,
  onChange,
  disabled,
  error,
  inputId,
}: MultiSelectInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedValues = value || [];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (option: string) => {
    if (selectedValues.includes(option)) {
      const newValues = selectedValues.filter(v => v !== option);
      onChange(newValues.length > 0 ? newValues : null);
    } else {
      onChange([...selectedValues, option]);
    }
  };

  const removeOption = (option: string) => {
    const newValues = selectedValues.filter(v => v !== option);
    onChange(newValues.length > 0 ? newValues : null);
  };

  return (
    <div>
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
      >
        {field.name}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div ref={dropdownRef} className="relative">
        {/* Selected values display */}
        <div
          className={`w-full min-h-[42px] px-3 py-2 border rounded-md shadow-sm cursor-pointer flex flex-wrap gap-1 items-center dark:bg-gray-700 ${
            error
              ? 'border-red-500'
              : 'border-gray-300 dark:border-gray-600'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={() => !disabled && setIsOpen(!isOpen)}
        >
          {selectedValues.length === 0 ? (
            <span className="text-gray-400 dark:text-gray-500">
              Select {field.name.toLowerCase()}...
            </span>
          ) : (
            selectedValues.map(val => (
              <span
                key={val}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 text-sm rounded-md"
              >
                {val}
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    removeOption(val);
                  }}
                  className="text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-100 focus:outline-none"
                  aria-label={`Remove ${val}`}
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))
          )}
          <svg
            className={`w-4 h-4 ml-auto text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Dropdown */}
        {isOpen && !disabled && (
          <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
            {field.options?.map(option => (
              <label
                key={option}
                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedValues.includes(option)}
                  onChange={() => toggleOption(option)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{option}</span>
              </label>
            ))}
            {(!field.options || field.options.length === 0) && (
              <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                No options available
              </div>
            )}
          </div>
        )}
      </div>

      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}

// Helper function to format custom field value for display
export function formatCustomFieldValue(
  field: CustomField,
  value: CustomFieldValue['value']
): string {
  if (value === null || value === undefined) return '-';

  switch (field.field_type) {
    case 'text':
    case 'date':
    case 'url':
      return String(value);
    case 'number':
      return String(value);
    case 'checkbox':
      return value ? 'Yes' : 'No';
    case 'select':
      return String(value);
    case 'multiselect':
      return Array.isArray(value) ? value.join(', ') : String(value);
    default:
      return String(value);
  }
}
