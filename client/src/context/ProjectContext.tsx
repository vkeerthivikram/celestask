import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { Project, CreateProjectDTO, UpdateProjectDTO, TreeNode, ProjectAssignee, ProjectAssigneeRole, CreateProjectAssigneeDTO } from '../types';
import * as api from '../services/api';
import { useToast } from './ToastContext';

export * from './ToastContext';

interface ProjectContextType {
  // State
  projects: Project[];
  currentProject: Project | null;
  currentProjectAssignees: ProjectAssignee[];
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchProjects: () => Promise<void>;
  setCurrentProject: (project: Project | null) => void;
  setCurrentProjectById: (id: number | null) => void;
  createProject: (data: CreateProjectDTO) => Promise<Project>;
  updateProject: (id: number, data: UpdateProjectDTO) => Promise<Project>;
  deleteProject: (id: number) => Promise<void>;
  clearError: () => void;
  
  // Tree methods
  fetchRootProjects: () => Promise<Project[]>;
  fetchProjectTree: (id: number) => Promise<TreeNode<Project>>;
  getProjectChildren: (id: number) => Promise<Project[]>;
  createSubProject: (parentId: number, data: CreateProjectDTO) => Promise<Project>;
  moveProject: (id: number, parentId: number | null) => Promise<Project>;
  
  // Assignment methods
  setProjectOwner: (projectId: number, personId: number | null) => Promise<Project>;
  fetchProjectAssignees: (projectId: number) => Promise<ProjectAssignee[]>;
  addProjectAssignee: (projectId: number, data: CreateProjectAssigneeDTO) => Promise<ProjectAssignee>;
  removeProjectAssignee: (projectId: number, assigneeId: number) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

interface ProjectProviderProps {
  children: ReactNode;
  currentProjectId?: number | null;
}

export function ProjectProvider({ children, currentProjectId }: ProjectProviderProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [currentProjectAssignees, setCurrentProjectAssignees] = useState<ProjectAssignee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  
  // Fetch all projects
  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await api.getProjects();
      setProjects(data);
      
      // Set current project if not already set
      if (!currentProject && data.length > 0) {
        if (currentProjectId) {
          const found = data.find(p => p.id === currentProjectId);
          if (found) {
            setCurrentProject(found);
          }
        } else {
          setCurrentProject(data[0]);
        }
      } else if (currentProjectId) {
        const found = data.find(p => p.id === currentProjectId);
        if (found) {
          setCurrentProject(found);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  }, [currentProject, currentProjectId]);
  
  // Set current project by ID
  const setCurrentProjectById = useCallback((id: number | null) => {
    if (id === null) {
      setCurrentProject(null);
      return;
    }
    
    const project = projects.find(p => p.id === id);
    if (project) {
      setCurrentProject(project);
    }
  }, [projects]);
  
  // Create a new project
  const createProject = useCallback(async (data: CreateProjectDTO): Promise<Project> => {
    setLoading(true);
    setError(null);
    
    try {
      const newProject = await api.createProject(data);
      setProjects(prev => [...prev, newProject]);
      toast.success('Project created', `"${newProject.name}" has been created successfully.`);
      return newProject;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create project';
      setError(errorMessage);
      toast.error('Failed to create project', errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [toast]);
  
  // Update an existing project
  const updateProject = useCallback(async (id: number, data: UpdateProjectDTO): Promise<Project> => {
    setLoading(true);
    setError(null);
    
    try {
      const updatedProject = await api.updateProject(id, data);
      setProjects(prev => 
        prev.map(p => p.id === id ? updatedProject : p)
      );
      
      // Update current project if it's the one being edited
      if (currentProject?.id === id) {
        setCurrentProject(updatedProject);
      }
      
      toast.success('Project updated', `"${updatedProject.name}" has been updated.`);
      return updatedProject;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update project';
      setError(errorMessage);
      toast.error('Failed to update project', errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [currentProject, toast]);
  
  // Delete a project
  const deleteProject = useCallback(async (id: number): Promise<void> => {
    const projectToDelete = projects.find(p => p.id === id);
    setLoading(true);
    setError(null);
    
    try {
      await api.deleteProject(id);
      setProjects(prev => prev.filter(p => p.id !== id));
      
      // If the deleted project was the current one, select another
      if (currentProject?.id === id) {
        const remainingProjects = projects.filter(p => p.id !== id);
        setCurrentProject(remainingProjects.length > 0 ? remainingProjects[0] : null);
      }
      
      toast.success('Project deleted', projectToDelete ? `"${projectToDelete.name}" has been deleted.` : 'Project has been deleted.');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete project';
      setError(errorMessage);
      toast.error('Failed to delete project', errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [currentProject, projects, toast]);
  
  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  // Fetch root projects (top-level projects without parents)
  const fetchRootProjects = useCallback(async (): Promise<Project[]> => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await api.getRootProjects();
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch root projects';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Fetch project tree (project with all descendants)
  const fetchProjectTree = useCallback(async (id: number): Promise<TreeNode<Project>> => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await api.getProjectTree(id);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch project tree';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Get direct children of a project
  const getProjectChildren = useCallback(async (id: number): Promise<Project[]> => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await api.getProjectChildren(id);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch project children';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Create a subproject under a parent project
  const createSubProject = useCallback(async (parentId: number, data: CreateProjectDTO): Promise<Project> => {
    setLoading(true);
    setError(null);
    
    try {
      const newProject = await api.createSubProject(parentId, data);
      setProjects(prev => [...prev, newProject]);
      toast.success('Sub-project created', `"${newProject.name}" has been created as a sub-project.`);
      return newProject;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create subproject';
      setError(errorMessage);
      toast.error('Failed to create sub-project', errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [toast]);
  
  // Move a project to a new parent
  const moveProject = useCallback(async (id: number, parentId: number | null): Promise<Project> => {
    setLoading(true);
    setError(null);
    
    try {
      const updatedProject = await api.moveProject(id, parentId);
      setProjects(prev => 
        prev.map(p => p.id === id ? updatedProject : p)
      );
      
      // Update current project if it's the one being moved
      if (currentProject?.id === id) {
        setCurrentProject(updatedProject);
      }
      
      toast.success('Project moved', parentId ? 'Project moved to new parent.' : 'Project moved to root level.');
      return updatedProject;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to move project';
      setError(errorMessage);
      toast.error('Failed to move project', errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [currentProject, toast]);
  
  // Set project owner
  const setProjectOwner = useCallback(async (projectId: number, personId: number | null): Promise<Project> => {
    setLoading(true);
    setError(null);
    
    try {
      const updatedProject = await api.setProjectOwner(projectId, personId);
      setProjects(prev => 
        prev.map(p => p.id === projectId ? updatedProject : p)
      );
      
      // Update current project if it's the one being updated
      if (currentProject?.id === projectId) {
        setCurrentProject(updatedProject);
      }
      
      toast.success('Owner updated', personId ? 'Project owner has been set.' : 'Project owner has been removed.');
      return updatedProject;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to set project owner';
      setError(errorMessage);
      toast.error('Failed to set owner', errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [currentProject, toast]);
  
  // Fetch project assignees
  const fetchProjectAssignees = useCallback(async (projectId: number): Promise<ProjectAssignee[]> => {
    setLoading(true);
    setError(null);
    
    try {
      const assignees = await api.getProjectAssignees(projectId);
      if (currentProject?.id === projectId) {
        setCurrentProjectAssignees(assignees);
      }
      return assignees;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch project assignees';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [currentProject]);
  
  // Add project assignee
  const addProjectAssignee = useCallback(async (projectId: number, data: CreateProjectAssigneeDTO): Promise<ProjectAssignee> => {
    setLoading(true);
    setError(null);
    
    try {
      const newAssignee = await api.addProjectAssignee(projectId, data);
      if (currentProject?.id === projectId) {
        setCurrentProjectAssignees(prev => [...prev, newAssignee]);
      }
      toast.success('Assignee added', 'Team member has been added to the project.');
      return newAssignee;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add project assignee';
      setError(errorMessage);
      toast.error('Failed to add assignee', errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [currentProject, toast]);
  
  // Remove project assignee
  const removeProjectAssignee = useCallback(async (projectId: number, assigneeId: number): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      await api.removeProjectAssignee(projectId, assigneeId);
      if (currentProject?.id === projectId) {
        setCurrentProjectAssignees(prev => prev.filter(a => a.id !== assigneeId));
      }
      toast.success('Assignee removed', 'Team member has been removed from the project.');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove project assignee';
      setError(errorMessage);
      toast.error('Failed to remove assignee', errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [currentProject, toast]);
  
  // Fetch projects on mount
  useEffect(() => {
    fetchProjects();
  }, []);
  
  // Update current project when currentProjectId changes
  useEffect(() => {
    if (currentProjectId !== undefined && currentProjectId !== null) {
      setCurrentProjectById(currentProjectId);
    }
  }, [currentProjectId, setCurrentProjectById]);
  
  const value: ProjectContextType = {
    projects,
    currentProject,
    currentProjectAssignees,
    loading,
    error,
    fetchProjects,
    setCurrentProject,
    setCurrentProjectById,
    createProject,
    updateProject,
    deleteProject,
    clearError,
    fetchRootProjects,
    fetchProjectTree,
    getProjectChildren,
    createSubProject,
    moveProject,
    setProjectOwner,
    fetchProjectAssignees,
    addProjectAssignee,
    removeProjectAssignee,
  };
  
  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjects(): ProjectContextType {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProjects must be used within a ProjectProvider');
  }
  return context;
}

/**
 * Helper function to get all ancestors of a project by traversing parent_project_id
 * Returns array from root to the immediate parent (excluding the project itself)
 */
export function getProjectAncestors(projects: Project[], projectId: string | number): Project[] {
  const ancestors: Project[] = [];
  const projectMap = new Map(projects.map(p => [String(p.id), p]));
  
  let currentProject = projectMap.get(String(projectId));
  
  while (currentProject && currentProject.parent_project_id) {
    const parent = projectMap.get(String(currentProject.parent_project_id));
    if (parent) {
      ancestors.unshift(parent);
      currentProject = parent;
    } else {
      break;
    }
  }
  
  return ancestors;
}

/**
 * Helper hook to get selected project ID and selection function
 * This provides a compatibility layer for components expecting `selectedProject` string
 */
export function useProjectSelection() {
  const { currentProject, setCurrentProjectById, projects } = useProjects();
  
  const selectedProject = currentProject ? String(currentProject.id) : null;
  
  const selectProject = useCallback((projectId: string | null) => {
    setCurrentProjectById(projectId ? parseInt(projectId, 10) : null);
  }, [setCurrentProjectById]);
  
  return {
    selectedProject,
    selectProject,
    currentProject,
    projects,
  };
}

export default ProjectContext;
