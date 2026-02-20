'use client';

import React, { useState, useCallback, useEffect } from 'react';
import type { Note, NoteEntityType, CreateNoteDTO, UpdateNoteDTO } from '../../types';
import { useNotes } from '../../context/NoteContext';
import { NoteCard } from './NoteCard';
import { NoteEditor } from './NoteEditor';
import { Modal } from './Modal';

interface NotesPanelProps {
  entityType: NoteEntityType;
  entityId: string;
  title?: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export function NotesPanel({
  entityType,
  entityId,
  title = 'Notes',
  collapsible = true,
  defaultExpanded = true,
}: NotesPanelProps) {
  const { notes, loading, fetchNotes, createNote, updateNote, deleteNote } = useNotes();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [showEditor, setShowEditor] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Note | null>(null);

  // Load notes when entity changes
  useEffect(() => {
    if (entityId) {
      fetchNotes(entityType, parseInt(entityId, 10));
    }
  }, [entityType, entityId, fetchNotes]);

  const handleAddNote = useCallback(() => {
    setEditingNote(null);
    setShowEditor(true);
  }, []);

  const handleEditNote = useCallback((note: Note) => {
    setEditingNote(note);
    setShowEditor(true);
  }, []);

  const handleDeleteClick = useCallback((note: Note) => {
    setShowDeleteConfirm(note);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (showDeleteConfirm) {
      await deleteNote(showDeleteConfirm.id);
      setShowDeleteConfirm(null);
    }
  }, [showDeleteConfirm, deleteNote]);

  const handleSaveNote = useCallback(
    async (data: CreateNoteDTO | UpdateNoteDTO) => {
      if (editingNote) {
        await updateNote(editingNote.id, data as UpdateNoteDTO);
      } else {
        await createNote(data as CreateNoteDTO);
      }
      setShowEditor(false);
      setEditingNote(null);
    },
    [editingNote, createNote, updateNote]
  );

  const handleCancelEditor = useCallback(() => {
    setShowEditor(false);
    setEditingNote(null);
  }, []);

  const toggleExpanded = useCallback(() => {
    setIsExpanded(!isExpanded);
  }, [isExpanded]);

  // Sort notes by updated_at (most recent first)
  const sortedNotes = [...notes].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div
        className={`flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200 ${
          collapsible ? 'cursor-pointer hover:bg-gray-100' : ''
        }`}
        onClick={collapsible ? toggleExpanded : undefined}
        role={collapsible ? 'button' : undefined}
        tabIndex={collapsible ? 0 : undefined}
        onKeyDown={
          collapsible
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleExpanded();
                }
              }
            : undefined
        }
        aria-expanded={collapsible ? isExpanded : undefined}
      >
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="text-sm font-medium text-gray-700">{title}</h3>
          <span className="text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">
            {notes.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isExpanded && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleAddNote();
              }}
              className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Add note"
              aria-label="Add note"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
          )}
          {collapsible && (
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          )}
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-4">
          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              <span className="ml-2 text-sm text-gray-500">Loading notes...</span>
            </div>
          )}

          {/* Empty State */}
          {!loading && notes.length === 0 && !showEditor && (
            <div className="text-center py-8">
              <svg
                className="mx-auto h-12 w-12 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="mt-2 text-sm text-gray-500">No notes yet</p>
              <button
                type="button"
                onClick={handleAddNote}
                className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Add your first note
              </button>
            </div>
          )}

          {/* Notes List */}
          {!loading && notes.length > 0 && (
            <div className="space-y-3">
              {sortedNotes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onEdit={handleEditNote}
                  onDelete={handleDeleteClick}
                />
              ))}
            </div>
          )}

          {/* Add Note Button (when there are existing notes) */}
          {!loading && notes.length > 0 && !showEditor && (
            <button
              type="button"
              onClick={handleAddNote}
              className="mt-4 w-full py-2 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-500 hover:border-blue-300 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add note
            </button>
          )}
        </div>
      )}

      {/* Note Editor Modal */}
      {showEditor && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <NoteEditor
            entityType={entityType}
            entityId={entityId}
            note={editingNote}
            onSave={handleSaveNote}
            onCancel={handleCancelEditor}
          />
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm !== null}
        onClose={() => setShowDeleteConfirm(null)}
        title="Delete Note"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete this note? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(null)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteConfirm}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default NotesPanel;
