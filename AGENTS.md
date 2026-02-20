## Feature Updates

### v2.0.0 - Next.js & shadcn/ui Migration (2026-02-20)

This update represents a major refactoring of the frontend architecture, migrating from a Vite + React Single Page Application (SPA) to Next.js 15 with App Router, while replacing custom UI components with `shadcn/ui`.

#### New Features & Architectural Changes

| Feature | Description |
|---------|-------------|
| **Next.js App Router** | Migrated routing from `react-router-dom` to file-based routing (`app/` directory) |
| **shadcn/ui Integration** | Replaced hand-crafted components with accessible, customizable shadcn/ui components |
| **API Proxying** | Configured Next.js rewrites to seamlessly proxy `/api/*` to the existing Express backend |
| **Server/Client Components** | Strategically added "use client" directives to maintain existing stateful context providers |

#### Files Modified (Key Changes)

| Directory/File | Changes |
|------|---------|
| `client/app/` | New directory for Next.js App Router pages (`layout.tsx`, `page.tsx`, `providers.tsx`, view pages) |
| `client/components/ui/` | New directory for generated shadcn/ui components |
| `client/next.config.ts` | Added for Next.js configuration and API proxy rewrites |
| `client/components.json` | Added for shadcn/ui configuration |
| `client/package.json` | Updated dependencies (`next`, `@radix-ui/*`, `class-variance-authority`, `cmdk`, etc.) |
| `client/src/components/common/` | Hand-crafted components replaced or refactored |
| `client/vite.config.ts`, `client/index.html` | Removed |

#### Agents Used for Migration

| Mode | Task | Description |
|------|------|-------------|
| **Copilot** | Frontend Migration | Migrated SPA to Next.js, set up shadcn/ui, converted routes, updated package dependencies and configurations |

---