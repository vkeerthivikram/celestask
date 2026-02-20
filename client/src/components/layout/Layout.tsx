'use client';

import React, { type ReactNode, useState, useCallback } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Modal } from '../common/Modal';
import { ProjectForm } from '../common/ProjectForm';
import { TaskForm } from '../common/TaskForm';
import { ImportExportPanel } from '../common/ImportExportPanel';
import { useApp } from '../../context/AppContext';
import { useProjects } from '../../context/ProjectContext';
import { useTasks } from '../../context/TaskContext';
import type { CreateProjectDTO, CreateTaskDTO, UpdateProjectDTO, UpdateTaskDTO, Task, Project } from '../../types';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { modal, closeModal, openTaskModal, openProjectModal } = useApp();
  const { createProject, updateProject, currentProject } = useProjects();
  const { createTask, updateTask } = useTasks();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Handle project form submission
  const handleProjectSubmit = useCallback(async (data: CreateProjectDTO | UpdateProjectDTO) => {
    setIsSubmitting(true);
    try {
      if (modal.data as Project) {
        await updateProject((modal.data as Project).id, data as UpdateProjectDTO);
      } else {
        await createProject(data as CreateProjectDTO);
      }
      closeModal();
    } catch (error) {
      console.error('Failed to save project:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [modal.data, createProject, updateProject, closeModal]);
  
  // Handle task form submission
  const handleTaskSubmit = useCallback(async (data: CreateTaskDTO | UpdateTaskDTO) => {
    setIsSubmitting(true);
    try {
      if (modal.data as Task) {
        await updateTask((modal.data as Task).id, data as UpdateTaskDTO);
      } else {
        await createTask(data as CreateTaskDTO);
      }
      closeModal();
    } catch (error) {
      console.error('Failed to save task:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [modal.data, createTask, updateTask, closeModal]);
  
  // Open add project modal
  const handleAddProject = useCallback(() => {
    openProjectModal();
  }, [openProjectModal]);
  
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <Sidebar onAddProject={handleAddProject} />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header />
        
        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>
      
      {/* Project Modal */}
      <Modal
        isOpen={modal.isOpen && modal.type === 'project'}
        onClose={closeModal}
        title={(modal.data as Project) ? 'Edit Project' : 'Create New Project'}
        size="md"
      >
        <ProjectForm
          project={modal.data as Project}
          onSubmit={handleProjectSubmit}
          onCancel={closeModal}
          isLoading={isSubmitting}
        />
      </Modal>
      
      {/* Task Modal */}
      <Modal
        isOpen={modal.isOpen && modal.type === 'task'}
        onClose={closeModal}
        title={(modal.data as Task) ? 'Edit Task' : 'Create New Task'}
        size="lg"
      >
        <TaskForm
          task={modal.data as Task}
          project={currentProject}
          projectId={currentProject?.id}
          onSubmit={handleTaskSubmit}
          onCancel={closeModal}
          isLoading={isSubmitting}
        />
      </Modal>
      
      {/* Import/Export Modal */}
      <Modal
        isOpen={modal.isOpen && modal.type === 'importExport'}
        onClose={closeModal}
        title="Data Management"
        size="lg"
      >
        <ImportExportPanel onClose={closeModal} />
      </Modal>
    </div>
  );
}

export default Layout;
