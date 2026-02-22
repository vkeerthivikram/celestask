'use client';

import React from 'react';
import { AppProvider } from '@/context/AppContext';
import { ToastProvider } from '@/context/ToastContext';
import { ProjectProvider } from '@/context/ProjectContext';
import { TaskProvider } from '@/context/TaskContext';
import { PeopleProvider } from '@/context/PeopleContext';
import { TagProvider } from '@/context/TagContext';
import { NoteProvider } from '@/context/NoteContext';
import { ShortcutProvider } from '@/context/ShortcutContext';
import { CommandPaletteProvider } from '@/context/CommandPaletteContext';
import { CustomFieldProvider } from '@/context/CustomFieldContext';
import { SavedViewProvider } from '@/context/SavedViewContext';
import { TimeEntryProvider } from '@/context/TimeEntryContext';
import { useProjects } from '@/context/ProjectContext';

// TaskProviderWrapper provides TaskProvider scoped to the current project
function TaskProviderWrapper({ children }: { children: React.ReactNode }) {
  const { currentProject } = useProjects();
  return (
    <TaskProvider projectId={currentProject?.id}>
      {children}
    </TaskProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <ToastProvider>
        <ProjectProvider>
          <PeopleProvider>
            <TagProvider>
              <ShortcutProvider>
                <CommandPaletteProvider>
                  <CustomFieldProvider>
                    <TimeEntryProvider>
                      <TaskProviderWrapper>
                        <SavedViewProvider>
                          <NoteProvider>
                            {children}
                          </NoteProvider>
                        </SavedViewProvider>
                      </TaskProviderWrapper>
                    </TimeEntryProvider>
                  </CustomFieldProvider>
                </CommandPaletteProvider>
              </ShortcutProvider>
            </TagProvider>
          </PeopleProvider>
        </ProjectProvider>
      </ToastProvider>
    </AppProvider>
  );
}
