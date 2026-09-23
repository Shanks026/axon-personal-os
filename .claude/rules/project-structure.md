# Project Structure

These rules apply to every file in the repository and are always in effect.

## Folder layout

```
axon/
├── CLAUDE.md
├── .claude/                      # rules, skills, feature docs, design notes (not shipped)
├── supabase/
│   └── migrations/               # mirror of every migration applied via MCP
├── public/
└── src/
    ├── main.jsx                  # ReactDOM root; renders <App />
    ├── App.jsx                   # providers only (QueryClient, Theme, Auth, Router, Toaster)
    ├── index.css                 # Tailwind entry + theme tokens (tokens TBD, see design-system.md)
    ├── routes/
    │   ├── router.jsx            # the one route tree (createBrowserRouter)
    │   └── guards.jsx            # RequireAuth, PublicOnly, SpaceBoundary
    ├── context/
    │   ├── AuthContext.jsx       # session, user, profile
    │   └── SpaceContext.jsx      # active space resolved from the URL
    ├── lib/                      # framework-agnostic helpers (no React, no JSX)
    │   ├── supabase.js           # the single createClient() call
    │   ├── queryClient.js
    │   ├── utils.js              # cn()
    │   ├── paths.js              # URL builders; never hand-build app URLs
    │   ├── dates.js              # formatDate, formatRelative, toISODate ...
    │   ├── fiscal.js             # fiscal-year / quarter maths
    │   └── position.js           # fractional ordering helpers
    ├── hooks/                    # cross-feature React hooks (useLocalStorage, useDebouncedValue ...)
    ├── components/
    │   ├── ui/                   # shadcn-generated primitives (managed by the shadcn CLI)
    │   ├── layout/               # AppShell (the persistent frame), AppSidebar, SpaceSwitcher, PageHeader
    │   ├── motion/               # shared motion presets + wrappers (PageTransition, AnimatedList)
    │   ├── editor/               # Tiptap RichTextEditor + extensions (shared by notes/tasks/reports)
    │   └── shared/               # reusable app components (EmptyState, ConfirmDialog, SpaceBadge, TagPicker ...)
    ├── features/
    │   └── <feature>/            # auth, spaces, tasks, todos, notes, calendar, journal, dashboard,
    │       │                     # reports, search, inbox, trash, settings
    │       ├── api.js            # ALL Supabase access for the feature + query hooks + key factory
    │       ├── constants.js      # enums, labels, defaults (optional)
    │       ├── schemas.js        # zod schemas (optional)
    │       ├── utils.js          # pure helpers for the feature (optional)
    │       ├── hooks/            # feature-specific hooks (useTaskFilters.js ...)
    │       ├── components/       # feature components
    │       └── pages/            # route-level components only
    └── tests/                    # vitest; mirrors src/ paths (tests/lib/fiscal.test.js)
```

## Where does a file go?

| It is... | Put it in |
|---|---|
| A route target | `features/<f>/pages/XxxPage.jsx` |
| Used by one feature only | `features/<f>/components/` or `features/<f>/hooks/` |
| Used by 2+ features | `components/shared/` (UI) or `hooks/` (logic) — move it the moment a second feature needs it |
| Pure function, no React | `lib/` (cross-feature) or `features/<f>/utils.js` |
| A shadcn primitive | `components/ui/` — add via `npx shadcn@latest add <name>`; local edits allowed but keep them minimal and note them in the changelog |

## Naming

- Components: `PascalCase.jsx` — the file name equals the exported component name.
- Hooks: `useCamelCase.js` (`.jsx` only if it returns JSX, which it should not). The exception is files the shadcn CLI generates (for example `hooks/use-mobile.js`), which keep their names so future `shadcn add` runs still resolve them.
- Everything else: `camelCase.js`.
- Pages end in `Page` (`TasksPage.jsx`); dialogs end in `Dialog`; sheets end in `Sheet`.
- Plain JavaScript only — no `.ts`/`.tsx`. Document non-obvious props with a short JSDoc block.

## Imports

- Always use the `@/` alias for anything under `src/` — no `../../` climbing. Same-folder `./` is fine.
- **No barrel files** (`index.js` re-exports). Import from the file that defines the thing.
- Named exports everywhere, except page components (default export: one page per file).
- Import order: react → third-party → `@/lib` → `@/context` → `@/hooks` → `@/components` → `@/features` → relative.

## Boundaries

- `@supabase/supabase-js` / `@/lib/supabase` may be imported **only** by `src/lib/supabase.js`, `src/features/*/api.js`, and `src/context/AuthContext.jsx`.
- A feature may import another feature's `api.js` hooks and its components, but never its `pages/`. If two features need each other's components, lift the shared piece into `components/shared/`.
- `lib/` never imports from `components/`, `features/`, or React.
- `components/ui/` never imports from `features/`.

## Tracking

Any new folder, top-level layout change, or new shared component is recorded in the changelog of `.claude/features/00-index.md`.
