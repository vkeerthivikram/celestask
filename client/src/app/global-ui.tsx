'use client';

import { ToastContainer } from '@/components/common/ToastContainer';
import { ShortcutHelp } from '@/components/common/ShortcutHelp';
import { CommandPalette } from '@/components/common/CommandPalette';

export function GlobalUI() {
  return (
    <>
      <ToastContainer />
      <ShortcutHelp />
      <CommandPalette />
    </>
  );
}
