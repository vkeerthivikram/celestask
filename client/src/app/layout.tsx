import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { GlobalUI } from './global-ui';

export const metadata: Metadata = {
  title: 'TaskTrack',
  description: 'Local-first project and task management',
};

// Script to set dark mode before hydration to prevent flash
const darkModeScript = `
(function() {
  const stored = localStorage.getItem('darkMode');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = stored !== null ? JSON.parse(stored) : prefersDark;
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: darkModeScript }} />
      </head>
      <body>
        <Providers>
          {children}
          <GlobalUI />
        </Providers>
      </body>
    </html>
  );
}
