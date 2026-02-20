import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { GlobalUI } from './global-ui';

export const metadata: Metadata = {
  title: 'TaskTrack',
  description: 'Local-first project and task management',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <Providers>
          {children}
          <GlobalUI />
        </Providers>
      </body>
    </html>
  );
}
