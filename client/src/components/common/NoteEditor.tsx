'use client';

import React, { useState, useCallback } from 'react';
import type { Note, CreateNoteDTO, UpdateNoteDTO } from '../../types';

interface NoteEditorProps {
  entityType: 'project' | 'task' | 'person';
  entityId: string;
  note?: Note | null;
  onSave: (data: CreateNoteDTO | UpdateNoteDTO) => Promise<void>;
  onCancel: () => void;
}

export function NoteEditor({
  entityType,
  entityId,
  note,
  onSave,
  onCancel,
}: NoteEditorProps) {
  const [content, setContent] = useState(note?.content ?? '');
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = useCallback(async () => {
    if (!content.trim()) {
      setError('Note content cannot be empty');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (note) {
        // Update existing note
        await onSave({ content: content.trim() } as UpdateNoteDTO);
      } else {
        // Create new note
        await onSave({
          entity_type: entityType,
          entity_id: parseInt(entityId, 10),
          content: content.trim(),
        } as CreateNoteDTO);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save note');
    } finally {
      setSaving(false);
    }
  }, [content, entityType, entityId, note, onSave]);

  const togglePreview = useCallback(() => {
    setShowPreview(!showPreview);
  }, [showPreview]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPreview(false)}
            className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
              !showPreview
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Write
          </button>
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
              showPreview
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Preview
          </button>
        </div>

        {/* Markdown hint */}
        <span className="text-xs text-gray-400">
          Markdown supported
        </span>
      </div>

      {/* Editor / Preview */}
      {!showPreview ? (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your note here... (Markdown supported)"
          className="w-full h-40 p-3 text-sm border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 resize-none"
          disabled={saving}
        />
      ) : (
        <div className="w-full h-40 p-3 border border-gray-200 rounded-lg overflow-auto bg-gray-50">
          {content.trim() ? (
            <div className="prose prose-sm max-w-none">
              {content}
            </div>
          ) : (
            <p className="text-gray-400 text-sm italic">
              Nothing to preview
            </p>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 mt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          disabled={saving}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={saving || !content.trim()}
        >
          {saving ? 'Saving...' : note ? 'Update Note' : 'Add Note'}
        </button>
      </div>

      {/* Markdown help */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <details className="text-xs text-gray-500">
          <summary className="cursor-pointer hover:text-gray-700">
            Markdown formatting tips
          </summary>
          <div className="mt-2 space-y-1 pl-4">
            <p><code className="bg-gray-100 px-1 rounded">**bold**</code> for <strong>bold</strong></p>
            <p><code className="bg-gray-100 px-1 rounded">*italic*</code> for <em>italic</em></p>
            <p><code className="bg-gray-100 px-1 rounded"># Heading</code> for headings</p>
            <p><code className="bg-gray-100 px-1 rounded">- item</code> for bullet lists</p>
            <p><code className="bg-gray-100 px-1 rounded">1. item</code> for numbered lists</p>
            <p><code className="bg-gray-100 px-1 rounded">[link](url)</code> for links</p>
            <p><code className="bg-gray-100 px-1 rounded">`code`</code> for inline code</p>
          </div>
        </details>
      </div>
    </div>
  );
}

export default NoteEditor;
