import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Pre-existing TypeScript strict errors are not migration-related; they existed
// before and were not enforced by Vite. Set NEXT_IGNORE_BUILD_ERRORS=true to
// suppress them (e.g. during the migration transition period).
const shouldIgnoreTypeErrors = process.env.NEXT_IGNORE_BUILD_ERRORS === 'true';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Silence the workspace root warning (monorepo with multiple lockfiles)
  outputFileTracingRoot: __dirname,
  // Enable standalone output for Docker
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: shouldIgnoreTypeErrors,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `http://backend:19096/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
