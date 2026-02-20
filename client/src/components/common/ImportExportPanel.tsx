'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import type { ExportStatus, ImportPayload, ImportResult, ImportMode } from '../../types';

// LocalStorage key for last export date
const LAST_EXPORT_KEY = 'taskflow-last-export';

/**
 * Format number with commas for display
 */
function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString();
}

/**
 * Get friendly table name
 */
function getTableName(table: string): string {
  const names: Record<string, string> = {
    projects: 'Projects',
    tasks: 'Tasks',
    people: 'People',
    tags: 'Tags',
    notes: 'Notes',
    task_assignees: 'Task Assignees',
    task_tags: 'Task Tags',
    project_assignees: 'Project Assignees',
    custom_fields: 'Custom Fields',
    custom_field_values: 'Custom Field Values',
    saved_views: 'Saved Views',
  };
  return names[table] || table;
}

interface ImportExportPanelProps {
  onClose?: () => void;
  onImportComplete?: () => void;
}

type ImportStep = 'select' | 'preview' | 'importing' | 'result';

interface FilePreview {
  version: string;
  exportedAt: string;
  tables: string[];
  recordCounts: Record<string, number>;
  totalRecords: number;
}

export function ImportExportPanel({ onClose, onImportComplete }: ImportExportPanelProps) {
  const toast = useToast();
  
  // Export state
  const [exportStatus, setExportStatus] = useState<ExportStatus | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [lastExport, setLastExport] = useState<string | null>(null);
  
  // Import state
  const [importStep, setImportStep] = useState<ImportStep>('select');
  const [importMode, setImportMode] = useState<ImportMode>('merge');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<FilePreview | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Load export status on mount
  useEffect(() => {
    loadExportStatus();
    const stored = localStorage.getItem(LAST_EXPORT_KEY);
    if (stored) {
      setLastExport(stored);
    }
  }, []);
  
  const loadExportStatus = async () => {
    try {
      const status = await api.importExport.getExportStatus();
      setExportStatus(status);
    } catch (error) {
      console.error('Failed to load export status:', error);
    }
  };
  
  // Export handlers
  const handleExportData = async () => {
    setIsExporting(true);
    try {
      await api.importExport.exportData();
      const now = new Date().toISOString();
      localStorage.setItem(LAST_EXPORT_KEY, now);
      setLastExport(now);
      toast.success('Export Complete', 'Your data has been downloaded as a JSON file.');
    } catch (error) {
      toast.error('Export Failed', error instanceof Error ? error.message : 'Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };
  
  const handleExportSqlite = async () => {
    setIsExporting(true);
    try {
      await api.importExport.exportSqlite();
      toast.success('Export Complete', 'Your database has been downloaded as a .db file.');
    } catch (error) {
      toast.error('Export Failed', error instanceof Error ? error.message : 'Failed to export database');
    } finally {
      setIsExporting(false);
    }
  };
  
  // Import handlers
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      validateAndPreviewFile(file);
    }
  }, []);
  
  const validateAndPreviewFile = async (file: File) => {
    setFileError(null);
    setFilePreview(null);
    setSelectedFile(null);
    
    // Check file extension
    if (!file.name.endsWith('.json')) {
      setFileError('Please select a valid JSON file');
      return;
    }
    
    try {
      const text = await file.text();
      const data = JSON.parse(text) as ImportPayload;
      
      // Validate structure
      if (!data.version || !data.exportedAt || !data.data) {
        setFileError('Invalid export file format. Missing required fields.');
        return;
      }
      
      // Build preview
      const tables = Object.keys(data.data);
      const recordCounts: Record<string, number> = {};
      let totalRecords = 0;
      
      for (const table of tables) {
        const count = Array.isArray(data.data[table]) ? data.data[table].length : 0;
        recordCounts[table] = count;
        totalRecords += count;
      }
      
      setFilePreview({
        version: data.version,
        exportedAt: data.exportedAt,
        tables,
        recordCounts,
        totalRecords,
      });
      setSelectedFile(file);
      setImportStep('preview');
    } catch (error) {
      if (error instanceof SyntaxError) {
        setFileError('Invalid JSON file. Please select a valid export file.');
      } else {
        setFileError('Failed to read file. Please try again.');
      }
    }
  };
  
  const handleImport = async () => {
    if (!selectedFile || !filePreview) return;
    
    setImportStep('importing');
    setImportError(null);
    setImportResult(null);
    
    try {
      const text = await selectedFile.text();
      const data = JSON.parse(text) as ImportPayload;
      
      const result = await api.importExport.importData(data, importMode);
      setImportResult(result);
      setImportStep('result');
      
      // Refresh export status
      await loadExportStatus();
      
      // Notify parent
      if (onImportComplete) {
        onImportComplete();
      }
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Import failed');
      setImportStep('result');
    }
  };
  
  const handleReset = () => {
    setImportStep('select');
    setSelectedFile(null);
    setFilePreview(null);
    setImportResult(null);
    setImportError(null);
    setFileError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      validateAndPreviewFile(file);
    }
  }, []);
  
  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);
  
  // Render export section
  const renderExportSection = () => (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide">Export Data</h3>
      
      {/* Export Status */}
      {exportStatus && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-600 mb-2">Current Database</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <span className="text-2xl font-bold text-gray-900">{formatNumber(exportStatus.totalRecords)}</span>
              <p className="text-xs text-gray-500">Total Records</p>
            </div>
            <div>
              <span className="text-2xl font-bold text-blue-600">{formatNumber(exportStatus.tableStats.projects || 0)}</span>
              <p className="text-xs text-gray-500">Projects</p>
            </div>
            <div>
              <span className="text-2xl font-bold text-green-600">{formatNumber(exportStatus.tableStats.tasks || 0)}</span>
              <p className="text-xs text-gray-500">Tasks</p>
            </div>
            <div>
              <span className="text-2xl font-bold text-purple-600">{formatNumber(exportStatus.tableStats.people || 0)}</span>
              <p className="text-xs text-gray-500">People</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Export Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleExportData}
          disabled={isExporting}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isExporting ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Exporting...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export Data (JSON)
            </>
          )}
        </button>
        
        <button
          onClick={handleExportSqlite}
          disabled={isExporting}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-gray-300"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
          </svg>
          Export Database (.db)
        </button>
      </div>
      
      {/* Last Export */}
      {lastExport && (
        <p className="text-xs text-gray-500">
          Last export: {formatDate(lastExport)}
        </p>
      )}
    </div>
  );
  
  // Render import section
  const renderImportSection = () => {
    switch (importStep) {
      case 'select':
        return (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide">Import Data</h3>
            
            {/* Drop Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="mt-2 text-sm text-gray-600">
                <span className="text-blue-600 font-medium">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-gray-500 mt-1">JSON export file only</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
                aria-label="Select export file"
              />
            </div>
            
            {/* File Error */}
            {fileError && (
              <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {fileError}
              </div>
            )}
          </div>
        );
        
      case 'preview':
        return (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide">Import Preview</h3>
            
            {/* File Info */}
            {filePreview && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{selectedFile?.name}</p>
                    <p className="text-xs text-gray-500">Exported: {formatDate(filePreview.exportedAt)}</p>
                  </div>
                  <span className="text-xs bg-gray-200 px-2 py-1 rounded">v{filePreview.version}</span>
                </div>
                
                {/* Record Counts */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">
                    {formatNumber(filePreview.totalRecords)} records to import
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {filePreview.tables.map(table => (
                      <span key={table} className="inline-flex items-center gap-1 bg-white px-2 py-1 rounded text-xs border">
                        <span className="text-gray-600">{getTableName(table)}:</span>
                        <span className="font-medium">{formatNumber(filePreview.recordCounts[table])}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* Import Mode */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Import Mode</label>
              <div className="flex flex-col gap-2">
                <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50">
                  <input
                    type="radio"
                    name="importMode"
                    value="merge"
                    checked={importMode === 'merge'}
                    onChange={() => setImportMode('merge')}
                    className="mt-1"
                  />
                  <div>
                    <span className="font-medium text-gray-900">Merge</span>
                    <p className="text-xs text-gray-500">Add new records, keep existing ones unchanged. Recommended for most cases.</p>
                  </div>
                </label>
                <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors has-[:checked]:border-red-500 has-[:checked]:bg-red-50">
                  <input
                    type="radio"
                    name="importMode"
                    value="replace"
                    checked={importMode === 'replace'}
                    onChange={() => setImportMode('replace')}
                    className="mt-1"
                  />
                  <div>
                    <span className="font-medium text-gray-900">Replace</span>
                    <p className="text-xs text-gray-500">Delete all existing data before import. This cannot be undone!</p>
                  </div>
                </label>
              </div>
            </div>
            
            {/* Warning for Replace Mode */}
            {importMode === 'replace' && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Warning: Replace mode will permanently delete all existing data before importing. This action cannot be undone.</span>
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleReset}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                  importMode === 'replace'
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {importMode === 'replace' ? 'Replace All Data' : 'Import Data'}
              </button>
            </div>
          </div>
        );
        
      case 'importing':
        return (
          <div className="text-center py-8">
            <svg className="animate-spin h-12 w-12 mx-auto text-blue-600" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="mt-4 text-lg font-medium text-gray-900">Importing data...</p>
            <p className="text-sm text-gray-500">Please wait while we process your data.</p>
          </div>
        );
        
      case 'result':
        return (
          <div className="space-y-4">
            {importError ? (
              <>
                <div className="bg-red-50 text-red-700 px-4 py-4 rounded-lg flex items-start gap-3">
                  <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="font-medium">Import Failed</p>
                    <p className="text-sm mt-1">{importError}</p>
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Try Again
                </button>
              </>
            ) : (
              importResult && (
                <>
                  <div className="bg-green-50 text-green-700 px-4 py-4 rounded-lg flex items-start gap-3">
                    <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="font-medium">Import Complete</p>
                      <p className="text-sm mt-1">Mode: {importResult.mode === 'merge' ? 'Merge' : 'Replace'}</p>
                    </div>
                  </div>
                  
                  {/* Summary */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Import Summary</h4>
                    <div className="space-y-3">
                      {Object.entries(importResult.summary).map(([table, stats]) => (
                        <div key={table} className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">{getTableName(table)}</span>
                          <div className="flex gap-3">
                            {stats.imported > 0 && (
                              <span className="text-green-600">{stats.imported} imported</span>
                            )}
                            {stats.skipped > 0 && (
                              <span className="text-yellow-600">{stats.skipped} skipped</span>
                            )}
                            {stats.errors > 0 && (
                              <span className="text-red-600">{stats.errors} errors</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Totals */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between font-medium">
                        <span className="text-gray-900">Total</span>
                        <div className="flex gap-3">
                          <span className="text-green-600">{importResult.totals.imported} imported</span>
                          {importResult.totals.skipped > 0 && (
                            <span className="text-yellow-600">{importResult.totals.skipped} skipped</span>
                          )}
                          {importResult.totals.errors > 0 && (
                            <span className="text-red-600">{importResult.totals.errors} errors</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Error Details */}
                  {importResult.errorDetails && importResult.errorDetails.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-yellow-800 mb-2">Some records had errors</h4>
                      <ul className="text-xs text-yellow-700 space-y-1 max-h-32 overflow-y-auto">
                        {importResult.errorDetails.slice(0, 10).map((error, idx) => (
                          <li key={idx}>
                            {getTableName(error.table)} ({error.id}): {error.error}
                          </li>
                        ))}
                        {importResult.errorDetails.length > 10 && (
                          <li>...and {importResult.errorDetails.length - 10} more errors</li>
                        )}
                      </ul>
                    </div>
                  )}
                  
                  <button
                    onClick={onClose || handleReset}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Done
                  </button>
                </>
              )
            )}
          </div>
        );
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Data Management</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        
        {/* Divider */}
        <hr className="border-gray-200" />
        
        {/* Export Section */}
        {renderExportSection()}
        
        {/* Divider */}
        <hr className="border-gray-200" />
        
        {/* Import Section */}
        {renderImportSection()}
      </div>
    </div>
  );
}

export default ImportExportPanel;
