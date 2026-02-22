'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Users, Plus, Search, Loader2, Mail, Building, Briefcase, MoreVertical, Edit2, Trash2, Globe } from 'lucide-react';
import { usePeople } from '../../context/PeopleContext';
import { useProjects } from '../../context/ProjectContext';
import type { Person, CreatePersonDTO, UpdatePersonDTO } from '../../types';
import { Modal, ConfirmModal } from '../common/Modal';
import { PersonForm } from '../common/PersonForm';
import { Button } from '../common/Button';
import { AppContextMenu, type AppContextMenuItem } from '../common/AppContextMenu';

export function PeopleView() {
  const { people, loading, error, createPerson, updatePerson, deletePerson } = usePeople();
  const { projects } = useProjects();
  
  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState<string>('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [deletingPerson, setDeletingPerson] = useState<Person | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Filter people
  const filteredPeople = useMemo(() => {
    let result = [...people];
    
    // Filter by search query
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(searchLower) ||
        p.email?.toLowerCase().includes(searchLower) ||
        p.company?.toLowerCase().includes(searchLower) ||
        p.designation?.toLowerCase().includes(searchLower)
      );
    }
    
    // Filter by project
    if (projectFilter === 'global') {
      result = result.filter(p => !p.project_id);
    } else if (projectFilter) {
      const projectId = parseInt(projectFilter, 10);
      result = result.filter(p => p.project_id === projectId);
    }
    
    // Sort by name
    result.sort((a, b) => a.name.localeCompare(b.name));
    
    return result;
  }, [people, searchQuery, projectFilter]);
  
  // Get project name by ID
  const getProjectName = useCallback((projectId: number | undefined): string => {
    if (!projectId) return 'Global';
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'Unknown Project';
  }, [projects]);
  
  // Get project color by ID
  const getProjectColor = useCallback((projectId: number | undefined): string => {
    if (!projectId) return '#6b7280';
    const project = projects.find(p => p.id === projectId);
    return project?.color || '#6b7280';
  }, [projects]);
  
  // Handle create person
  const handleCreatePerson = async (data: CreatePersonDTO | UpdatePersonDTO) => {
    setIsSubmitting(true);
    try {
      await createPerson(data as CreatePersonDTO);
      setIsAddModalOpen(false);
    } catch (err) {
      console.error('Failed to create person:', err);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle update person
  const handleUpdatePerson = async (data: CreatePersonDTO | UpdatePersonDTO) => {
    if (!editingPerson) return;
    setIsSubmitting(true);
    try {
      await updatePerson(editingPerson.id, data as UpdatePersonDTO);
      setEditingPerson(null);
    } catch (err) {
      console.error('Failed to update person:', err);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle delete person
  const handleDeletePerson = async () => {
    if (!deletingPerson) return;
    setIsSubmitting(true);
    try {
      await deletePerson(deletingPerson.id);
      setDeletingPerson(null);
    } catch (err) {
      console.error('Failed to delete person:', err);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400">Loading people...</p>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center max-w-md p-6 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="text-red-600 dark:text-red-400 mb-2">Error loading people</p>
          <p className="text-sm text-red-500 dark:text-red-300">{error}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">People</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {people.length} {people.length === 1 ? 'person' : 'people'} total
              </p>
            </div>
          </div>
          
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsAddModalOpen(true)}
          >
            Add Person
          </Button>
        </div>
        
        {/* Filters */}
        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search people..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={twMerge(
                clsx(
                  'w-full pl-10 pr-4 py-2 rounded-md border shadow-sm',
                  'bg-white dark:bg-gray-900',
                  'text-gray-900 dark:text-gray-100',
                  'placeholder-gray-400 dark:placeholder-gray-500',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
                  'border-gray-300 dark:border-gray-600'
                )
              )}
            />
          </div>
          
          {/* Project Filter */}
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className={twMerge(
              clsx(
                'px-3 py-2 rounded-md border shadow-sm',
                'bg-white dark:bg-gray-900',
                'text-gray-900 dark:text-gray-100',
                'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
                'border-gray-300 dark:border-gray-600'
              )
            )}
          >
            <option value="">All People</option>
            <option value="global">Global (All Projects)</option>
            {projects.map(project => (
              <option key={project.id} value={project.id.toString()}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {/* People List */}
      <div className="flex-1 overflow-auto p-4">
        {filteredPeople.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {people.length === 0 ? 'No people yet' : 'No people match your search'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-sm">
              {people.length === 0
                ? 'Add people to your team to start assigning them to tasks.'
                : 'Try adjusting your search or filter criteria.'}
            </p>
            {people.length === 0 && (
              <Button
                variant="primary"
                size="sm"
                className="mt-4"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => setIsAddModalOpen(true)}
              >
                Add First Person
              </Button>
            )}
          </div>
        ) : (
          // People Grid
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredPeople.map(person => (
              <PersonCard
                key={person.id}
                person={person}
                projectName={getProjectName(person.project_id)}
                projectColor={getProjectColor(person.project_id)}
                onEdit={() => setEditingPerson(person)}
                onDelete={() => setDeletingPerson(person)}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Add Person Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Person"
        size="md"
      >
        <PersonForm
          projects={projects}
          onSubmit={handleCreatePerson}
          onCancel={() => setIsAddModalOpen(false)}
          isLoading={isSubmitting}
        />
      </Modal>
      
      {/* Edit Person Modal */}
      <Modal
        isOpen={editingPerson !== null}
        onClose={() => setEditingPerson(null)}
        title="Edit Person"
        size="md"
      >
        {editingPerson && (
          <PersonForm
            person={editingPerson}
            projects={projects}
            onSubmit={handleUpdatePerson}
            onCancel={() => setEditingPerson(null)}
            isLoading={isSubmitting}
          />
        )}
      </Modal>
      
      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deletingPerson !== null}
        onClose={() => setDeletingPerson(null)}
        onConfirm={handleDeletePerson}
        title="Delete Person"
        message={`Are you sure you want to delete "${deletingPerson?.name}"? This will remove them from all assigned tasks. This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isSubmitting}
      />
    </div>
  );
}

// Person Card Component
interface PersonCardProps {
  person: Person;
  projectName: string;
  projectColor: string;
  onEdit: () => void;
  onDelete: () => void;
}

function PersonCard({ person, projectName, projectColor, onEdit, onDelete }: PersonCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);

  const closeContextMenu = () => {
    setContextMenuPosition(null);
  };

  const contextMenuItems = [
    {
      id: 'edit-person',
      label: 'Edit person',
      onSelect: onEdit,
    },
    {
      id: 'delete-person',
      label: 'Delete person',
      onSelect: onDelete,
      danger: true,
    },
  ];
  
  return (
    <>
    <div
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
      onContextMenu={(event) => {
        event.preventDefault();
        setShowMenu(false);
        setContextMenuPosition({ x: event.clientX, y: event.clientY });
      }}
      onKeyDown={(event) => {
        if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
          event.preventDefault();
          const rect = (event.currentTarget as HTMLDivElement).getBoundingClientRect();
          setShowMenu(false);
          setContextMenuPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
        }
      }}
      tabIndex={0}
      role="group"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
            <span className="text-primary-600 dark:text-primary-400 font-semibold text-lg">
              {person.name.charAt(0).toUpperCase()}
            </span>
          </div>
          
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
              {person.name}
            </h3>
            {person.designation && (
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {person.designation}
              </p>
            )}
          </div>
        </div>
        
        {/* Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Person actions"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          
          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onEdit();
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onDelete();
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Details */}
      <div className="mt-4 space-y-2">
        {person.email && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Mail className="w-4 h-4 flex-shrink-0" />
            <a
              href={`mailto:${person.email}`}
              className="hover:text-primary-600 dark:hover:text-primary-400 truncate"
            >
              {person.email}
            </a>
          </div>
        )}
        
        {person.company && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Building className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{person.company}</span>
          </div>
        )}
        
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          {person.project_id ? (
            <>
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: projectColor }}
              />
              <span className="truncate">{projectName}</span>
            </>
          ) : (
            <>
              <Globe className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">Global (All Projects)</span>
            </>
          )}
        </div>
      </div>
    </div>
    <AppContextMenu
      open={Boolean(contextMenuPosition)}
      x={contextMenuPosition?.x ?? 0}
      y={contextMenuPosition?.y ?? 0}
      items={contextMenuItems}
      onClose={closeContextMenu}
    />
    </>
  );
}

export default PeopleView;
