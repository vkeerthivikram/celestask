import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useCommandPalette } from '../../context/CommandPaletteContext';
import { useApp } from '../../context/AppContext';
import { useProjectSelection } from '../../context/ProjectContext';
import { useTasks } from '../../context/TaskContext';
import { usePeople } from '../../context/PeopleContext';
import type { ViewType } from '../../types';

// Command types
interface Command {
  id: string;
  type: 'navigation' | 'task' | 'project' | 'person' | 'action';
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
  shortcut?: string;
  action: () => void;
}

// Fuzzy search function
function fuzzyMatch(text: string, query: string): { score: number; matches: number[] } {
  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();
  
  // Direct substring match gets highest score
  if (textLower.includes(queryLower)) {
    const index = textLower.indexOf(queryLower);
    return { score: 100 - index, matches: [index, index + query.length] };
  }
  
  // Fuzzy match: find each character in order
  let score = 0;
  let matches: number[] = [];
  let queryIndex = 0;
  let lastMatchIndex = -1;
  let consecutiveBonus = 0;
  
  for (let i = 0; i < text.length && queryIndex < query.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      matches.push(i);
      if (lastMatchIndex === i - 1) {
        consecutiveBonus += 10;
      }
      score += 10 + consecutiveBonus;
      lastMatchIndex = i;
      queryIndex++;
    }
  }
  
  // All query characters must be found
  if (queryIndex < query.length) {
    return { score: 0, matches: [] };
  }
  
  return { score, matches };
}

// Highlight matched text
function highlightMatches(text: string, matches: number[]): React.ReactNode {
  if (matches.length === 0) return text;
  
  const result: React.ReactNode[] = [];
  let lastIndex = 0;
  const matchSet = new Set(matches);
  
  for (let i = 0; i <= text.length; i++) {
    if (matchSet.has(i) !== matchSet.has(i - 1) || i === text.length) {
      if (lastIndex < i) {
        const chunk = text.slice(lastIndex, i);
        if (matchSet.has(i - 1)) {
          result.push(<mark key={lastIndex} className="bg-yellow-200 text-inherit rounded px-0.5">{chunk}</mark>);
        } else {
          result.push(chunk);
        }
      }
      lastIndex = i;
    }
  }
  
  return result;
}

// Icons
const NavigationIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
  </svg>
);

const TaskIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
);

const ProjectIcon = ({ color = '#6B7280' }: { color?: string }) => (
  <span className="w-4 h-4 flex items-center justify-center" style={{ color }}>
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7H13L11 5H5C3.89543 5 3 5.89543 3 7Z" />
    </svg>
  </span>
);

const PersonIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const ActionIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const SearchIcon = () => (
  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

export function CommandPalette() {
  const { isOpen, closePalette } = useCommandPalette();
  const { setCurrentView, openTaskModal, openProjectModal } = useApp();
  const { projects, selectProject } = useProjectSelection();
  const { tasks } = useTasks();
  const { people } = usePeople();
  
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  
  // View shortcuts mapping
  const viewShortcuts: Record<string, string> = {
    dashboard: '⌘1',
    kanban: '⌘2',
    list: '⌘3',
    calendar: '⌘4',
    timeline: '⌘5',
    people: '⌘6',
  };
  
  // Build all commands
  const allCommands = useMemo<Command[]>(() => {
    const commands: Command[] = [];
    
    // Navigation commands
    const views: { id: ViewType; label: string }[] = [
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'kanban', label: 'Kanban Board' },
      { id: 'list', label: 'List View' },
      { id: 'calendar', label: 'Calendar' },
      { id: 'timeline', label: 'Timeline' },
      { id: 'people', label: 'People' },
    ];
    
    views.forEach(view => {
      commands.push({
        id: `nav-${view.id}`,
        type: 'navigation',
        label: view.label,
        shortcut: viewShortcuts[view.id],
        icon: <NavigationIcon />,
        action: () => {
          setCurrentView(view.id);
          closePalette();
        },
      });
    });
    
    // Task commands (recent tasks)
    const recentTasks = [...tasks]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 10);
    
    recentTasks.forEach(task => {
      const project = projects.find(p => p.id === task.project_id);
      commands.push({
        id: `task-${task.id}`,
        type: 'task',
        label: task.title,
        sublabel: project ? `In ${project.name}` : undefined,
        icon: <TaskIcon />,
        action: () => {
          selectProject(String(task.project_id));
          setCurrentView('kanban');
          closePalette();
        },
      });
    });
    
    // Project commands
    projects.forEach(project => {
      const taskCount = tasks.filter(t => t.project_id === project.id).length;
      commands.push({
        id: `project-${project.id}`,
        type: 'project',
        label: project.name,
        sublabel: `${taskCount} tasks`,
        icon: <ProjectIcon color={project.color} />,
        action: () => {
          selectProject(String(project.id));
          setCurrentView('kanban');
          closePalette();
        },
      });
    });
    
    // People commands
    people.forEach(person => {
      commands.push({
        id: `person-${person.id}`,
        type: 'person',
        label: person.name,
        sublabel: person.company || person.email,
        icon: <PersonIcon />,
        action: () => {
          setCurrentView('people');
          closePalette();
        },
      });
    });
    
    // Action commands
    commands.push({
      id: 'action-new-task',
      type: 'action',
      label: 'Create new task',
      icon: <ActionIcon />,
      action: () => {
        openTaskModal();
        closePalette();
      },
    });
    
    commands.push({
      id: 'action-new-project',
      type: 'action',
      label: 'Create new project',
      icon: <ActionIcon />,
      action: () => {
        openProjectModal();
        closePalette();
      },
    });
    
    commands.push({
      id: 'action-new-person',
      type: 'action',
      label: 'Create new person',
      icon: <ActionIcon />,
      action: () => {
        setCurrentView('people');
        closePalette();
      },
    });
    
    return commands;
  }, [tasks, projects, people, setCurrentView, selectProject, closePalette, openTaskModal, openProjectModal]);
  
  // Filter commands based on query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) {
      return allCommands;
    }
    
    const results = allCommands.map(command => {
      const { score } = fuzzyMatch(command.label, query);
      const sublabelScore = command.sublabel ? fuzzyMatch(command.sublabel, query).score / 2 : 0;
      const totalScore = Math.max(score, sublabelScore);
      return { command, score: totalScore };
    }).filter(({ score }) => score > 0);
    
    results.sort((a, b) => b.score - a.score);
    return results.map(({ command }) => command);
  }, [allCommands, query]);
  
  // Group commands by type
  const groupedCommands = useMemo(() => {
    const groups: { type: string; label: string; commands: Command[] }[] = [];
    const typeLabels: Record<string, string> = {
      navigation: 'Navigation',
      task: 'Tasks',
      project: 'Projects',
      person: 'People',
      action: 'Actions',
    };
    
    const seenTypes = new Set<string>();
    filteredCommands.forEach(command => {
      if (!seenTypes.has(command.type)) {
        seenTypes.add(command.type);
        groups.push({
          type: command.type,
          label: typeLabels[command.type] || command.type,
          commands: [],
        });
      }
      groups[groups.length - 1].commands.push(command);
    });
    
    return groups;
  }, [filteredCommands]);
  
  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  }, [isOpen]);
  
  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);
  
  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const totalItems = filteredCommands.length;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % totalItems);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + totalItems) % totalItems);
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
        }
        break;
      case 'Escape':
        e.preventDefault();
        closePalette();
        break;
    }
  }, [filteredCommands, selectedIndex, closePalette]);
  
  if (!isOpen) return null;
  
  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/50 backdrop-blur-sm"
      onClick={closePalette}
    >
      <div 
        className="w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
          <SearchIcon />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search tasks, projects, people..."
            className="flex-1 text-lg outline-none placeholder-gray-400"
          />
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
            ESC to close
          </span>
        </div>
        
        {/* Results */}
        <div 
          ref={listRef}
          className="max-h-[60vh] overflow-y-auto py-2"
        >
          {groupedCommands.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">
              No results found for "{query}"
            </div>
          ) : (
            groupedCommands.map(group => (
              <div key={group.type}>
                <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {group.label}
                </div>
                {group.commands.map(command => {
                  const globalIndex = filteredCommands.indexOf(command);
                  const { matches } = query 
                    ? fuzzyMatch(command.label, query)
                    : { matches: [] };
                  
                  return (
                    <button
                      key={command.id}
                      data-index={globalIndex}
                      onClick={() => command.action()}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                        globalIndex === selectedIndex
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className={globalIndex === selectedIndex ? 'text-blue-500' : 'text-gray-400'}>
                        {command.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {highlightMatches(command.label, matches)}
                        </div>
                        {command.sublabel && (
                          <div className="text-sm text-gray-500 truncate">
                            {command.sublabel}
                          </div>
                        )}
                      </div>
                      {command.shortcut && (
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                          {command.shortcut}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded shadow-sm">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded shadow-sm">↓</kbd>
              to navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded shadow-sm">Enter</kbd>
              to select
            </span>
          </div>
          <span className="text-gray-400">
            {filteredCommands.length} results
          </span>
        </div>
      </div>
    </div>
  );
}

export default CommandPalette;
