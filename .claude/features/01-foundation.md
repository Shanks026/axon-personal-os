# Feature 01: Foundation (Scaffold, Tooling, App Skeleton)

**Product**: Axon, a personal second-brain OS
**File**: `.claude/features/01-foundation.md`
**Status**: ✅ Complete
**Depends on**: none
**Last Updated**: September 2026

---

## Context

Nothing exists yet. This feature creates the Vite + React (JS) project, installs and configures the whole stack (Tailwind v4, shadcn, React Query, Router, motion, Supabase client, Vitest), and lays down the folder structure from `.claude/rules/project-structure.md`. It also creates the shared primitives every later feature relies on: `cn`, `paths`, `dates`, `position`, motion presets, `EmptyState` and `ConfirmDialog`. No database work happens here.

---

## Phase Overview

```
Phase 1: Scaffold and tooling
  Vite React JS project, dependencies, Tailwind v4 + shadcn init, alias, ESLint/Prettier, Vitest, env, git.

Phase 2: App skeleton
  Providers, router with placeholder routes, lib helpers, motion presets, shared EmptyState/ConfirmDialog, error and 404 pages.
```

**After each phase, stop and wait for approval.**

---

## Phase 1: Scaffold and Tooling ✅ Complete

### Goal
`npm run dev` serves a blank Axon page styled by Tailwind v4, with shadcn initialised. `npm run lint`, `npm test` and `npm run build` all pass. The repo is under git, and secrets are git-ignored.

### Before Starting: Confirm With Codebase
1. `c:\Users\chris_austin\Desktop\axon` contains only `CLAUDE.md` and `.claude/`. Don't overwrite either of them.
2. Check the current Vite scaffolding command and template (`npm create vite@latest`, template `react`, not `react-ts`). Scaffold into a temp folder and move the files in, because the folder is not empty.
3. Check the current shadcn CLI init flow for Vite and Tailwind v4 (`npx shadcn@latest init`) and the files it writes (`components.json`, `src/lib/utils.js`, `src/index.css` tokens). Use JavaScript (`"tsx": false`).
4. Check the current `motion` package name and import path (`motion/react`).
5. Confirm Node ≥ 20 (`node -v`).

### 1.1 Database
No database changes in this phase.

### 1.2 Setup Steps
1. Scaffold Vite React (JS) and move the files into the repo root. Rename the package to `axon`.
2. `git init`. Create `.gitignore` covering `node_modules`, `dist`, `.env*.local`, `coverage` and `.DS_Store`.
3. Tailwind v4: `npm i tailwindcss @tailwindcss/vite`, add the plugin to `vite.config.js`, and put `@import "tailwindcss";` in `src/index.css`.
4. Aliases: `vite.config.js` gets `resolve.alias['@'] = path.resolve(__dirname, 'src')`, and `jsconfig.json` gets `compilerOptions.paths { "@/*": ["./src/*"] }`.
5. `npx shadcn@latest init`: neutral base colour, CSS variables, lucide icons. Then add the base primitives the skeleton needs: `button card dialog alert-dialog dropdown-menu input label textarea form tooltip skeleton separator sonner sidebar sheet popover command select tabs badge avatar scroll-area calendar chart context-menu checkbox switch toggle-group`.
6. Runtime dependencies:
   `@tanstack/react-query @tanstack/react-query-devtools react-router @supabase/supabase-js react-hook-form @hookform/resolvers zod date-fns motion sonner react-hotkeys-hook @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities use-debounce`
   Check whether the current React Router v7 package is `react-router` (the v7 default) or `react-router-dom`. Use `react-router`.
7. Dev dependencies: `vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event prettier prettier-plugin-tailwindcss eslint-plugin-react-hooks` (plus whatever the Vite template's ESLint config already includes).
8. Scripts: `dev`, `build`, `preview`, `lint`, `format` (`prettier --write .`), `test` (`vitest run`), `test:watch`.
9. Vitest config: jsdom environment, `setupFiles: ['src/tests/setup.js']` importing `@testing-library/jest-dom/vitest`, and the `@` alias.
10. `.env.local` holds `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (values from `CLAUDE.md` / the user). Commit an `.env.example` with empty values.
11. ESLint: enforce `react-hooks/rules-of-hooks` (error) and `react-hooks/exhaustive-deps` (warn), plus `no-restricted-imports`: `@supabase/supabase-js` is forbidden outside `src/lib/supabase.js` (via an override).
12. Create the empty folder skeleton from `project-structure.md`, adding a `.gitkeep` where a folder would otherwise be empty.
13. Delete the Vite demo assets and counter. `App.jsx` renders `<div className="min-h-svh bg-background text-foreground">Axon</div>`.
14. `index.html`: title "Axon", `<meta name="color-scheme" content="light dark">`, and a placeholder favicon.

### 1.3 Components
None beyond the placeholder `App.jsx`.

### 1.4 Routes and Integration
None.

### 1.5 Impact on Existing Features
None. This is the first feature.

### 1.6 Not in This Phase
- Providers, router and helpers (Phase 2)
- Design tokens beyond the shadcn defaults. The design system is now adopted, and its tokens go into `index.css` in Phase 2.

### 1.7 Checklist: Before Marking Complete
- [x] `npm run dev` serves "Axon" with Tailwind classes applied
- [x] `components.json` exists, with JSX (not TSX) and the `@/components/ui` alias; the primitives listed above are in `src/components/ui/`
- [x] `@/` imports resolve in Vite and Vitest
- [x] `npm run lint`, `npm test` (a trivial smoke test) and `npm run build` pass
- [x] `.env.local` is git-ignored and `.env.example` is committed
- [x] `git status` is clean after the initial commit (`0b1961d`, pushed to github.com/Shanks026/axon-personal-os `main`)
- [x] The folder skeleton matches `project-structure.md`
- [x] `00-index.md` status and changelog are updated

### Implementation Notes (Phase 1)
- **React Router is pinned to `react-router@7` (7.18).** v8 is the current latest, but it needs Node 22.22 or newer and the machine runs 22.13.1. Upgrade later with Node.
- **Linting uses oxlint, not ESLint.** The Vite 8 template ships oxlint (`.oxlintrc.json`). It enforces:
  - `react/rules-of-hooks` (error) and `react/exhaustive-deps` (warn).
  - `no-restricted-imports`:
    - Blocks `@supabase/supabase-js` everywhere except `src/lib/supabase.js`.
    - Blocks relative climbing imports. The glob must be `../**`, because `../*` doesn't match.
  - Overrides that relax `only-export-components` and `set-state-in-effect` for shadcn-generated files.
- **shadcn v4:**
  - Init asks for a base library and a preset. The choices were `-b radix -p nova`: Lucide and Geist, style `radix-nova`, neutral base colour.
  - `form` no longer exists and is replaced by **`field`**. Also added: `hover-card` (needed for entity chips), plus `input-group` and `toggle`, which came in as dependencies.
  - Utilities now come from the official `cn` package, re-exported by `src/lib/utils.js`.
  - `sonner.jsx` imports `next-themes`, which was installed automatically. Phase 2 decides whether to keep it.
  - `src/hooks/use-mobile.js` is generated by shadcn and exempt from hook naming (rule updated).
- **Other versions:** zod v4 (4.6.5), installed explicitly because npm first resolved 3.25. Vite 8.3, Vitest 5, motion 13 (`motion/react`), Tailwind 4.3.
- **Fonts:** Geist and Geist Mono installed through `@fontsource-variable/*`. shadcn wired up Geist; Geist Mono gets wired in Phase 2 with the tokens.
- **Prettier:** config has no semicolons, single quotes and width 100, plus the Tailwind plugin. It ignores `src/components/ui`, `.claude`, `*.md` and `tercero-feature/`.
- **Rules updated:** `components.md` (the Field form pattern), `project-structure.md` (the shadcn hook exception), and `CLAUDE.md` (lint and version notes).
- **Vitest config** lives in `vite.config.js` (`test` block). There's no separate `vitest.config.js`.

**Phase 1 is done.**

---

## Phase 2: App Skeleton ✅ Complete

### Goal
The app boots through the full provider stack into a router with placeholder routes. Shared helpers and components exist and are tested. Navigating to an unknown URL shows the 404 page, and a thrown render error shows the error page. Theme switching works (system, light or dark).

### Before Starting: Confirm Phase 1 Is Approved
1. Phase 1 is `✅ Complete`.
2. Check the current React Router v7 data-router APIs: `createBrowserRouter`, `RouterProvider`, and route `lazy`.
3. Check the shadcn `sonner` wrapper's theme handling. It imports `next-themes` by default. Either install `next-themes` (it works in Vite) or adapt the wrapper to the local ThemeProvider. Prefer the local ThemeProvider and a minimal edit to `components/ui/sonner.jsx`, and note the edit in the changelog.

### 2.1 Database
No database changes in this phase.

### 2.2 Library Layer

| File | Exports | Notes |
|---|---|---|
| `src/lib/supabase.js` | `supabase` | `createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })`. Throws a clear error if either env var is missing. |
| `src/lib/queryClient.js` | `queryClient` | defaults `staleTime: 30_000`, `retry: 1`, `refetchOnWindowFocus: false` |
| `src/lib/utils.js` | `cn` | (from shadcn) |
| `src/lib/paths.js` | `paths` | `paths.login()`, `signup()`, `forgotPassword()`, `resetPassword()`, `spaces()`, `settings(section?)`, `space(slug)` returns `{ root, dashboard, inbox, tasks, task(id), todos, notes, note(id), journal(date?), calendar(params?), reports, report(id), trash }`. The global slug constant is `GLOBAL_SLUG = 'global'`. |
| `src/lib/dates.js` | `formatDate(d)` ("23 Sep 2026"), `formatDateShort` ("23 Sep"), `formatRelative(d)` ("2h ago", "yesterday"), `formatDueLabel(date)` ("Today", "Tomorrow", "Overdue · 3d", "Fri 26 Sep"), `toISODate(d)` ("yyyy-MM-dd"), `parseISODate(s)`, `isOverdue(date)` | All built on date-fns and fed from the user's week start (passed in; no global state). |
| `src/lib/position.js` | `positionBetween`, `positionAfterLast`, `needsRebalance` | see `axon-data-patterns.md` §5 |

Tests: `src/tests/lib/paths.test.js`, `dates.test.js` and `position.test.js`.

### 2.3 Components

```
src/
├── App.jsx                               # providers
├── routes/
│   ├── router.jsx                        # route tree with placeholders
│   └── guards.jsx                        # stubs (filled in Feature 02)
├── components/
│   ├── theme/ThemeProvider.jsx           # system | light | dark; class on <html>; localStorage 'axon-theme'
│   ├── theme/useTheme.js
│   ├── motion/presets.js                 # PLACEHOLDER values until design system
│   ├── motion/PageTransition.jsx
│   ├── motion/AnimatedList.jsx           # AnimatePresence + layout items
│   ├── shared/EmptyState.jsx
│   ├── shared/ConfirmDialog.jsx
│   ├── shared/ErrorState.jsx             # inline error + retry
│   └── shared/Splash.jsx                 # neutral full-screen loading splash
└── features/
    └── system/pages/
        ├── NotFoundPage.jsx
        └── RouteErrorPage.jsx            # errorElement for all routes
```

- **`App.jsx`** order: `ThemeProvider` → `QueryClientProvider` → `MotionConfig reducedMotion="user"` → `TooltipProvider` → `RouterProvider` → `Toaster`. `ReactQueryDevtools` is added in dev only. `AuthProvider` is inserted in Feature 02.
- **`presets.js`** exports `durations`, `easings`, `springs` and variants: `fadeIn`, `slideUp`, `scaleIn`, `listItem`, `pageTransition`, `staggerContainer(stagger)`. The values are placeholders marked `// TODO(design-system)`.
- **`PageTransition`**: a `motion.div` using `pageTransition` variants (initial, animate, exit).
- **`AnimatedList`**: `({ items, getKey, renderItem, className })`. It wraps items in `AnimatePresence initial={false}` with `motion.div layout variants={listItem}`.
- **`EmptyState`**: `({ icon: Icon, title, description, action, className })`, centred, with a subtle fade-in.
- **`ConfirmDialog`**: `({ open, onOpenChange, title, description, confirmLabel = 'Delete', destructive = true, requireText, onConfirm, pending })`. When `requireText` is set, the confirm button stays disabled until the input exactly matches it.
- **`ErrorState`**: `({ error, onRetry, title = 'Something went wrong' })`.
- **`router.jsx`**: the full tree from `routing.md`, with each page a lazy placeholder (`<div>TasksPage</div>`) living in its future feature folder under `pages/`, so later features replace the file rather than rewire routes. The `*` route renders `NotFoundPage`.

### 2.4 Routes and Integration
- `main.jsx` renders `<App />`.
- Every route gets `errorElement: <RouteErrorPage />`.

### 2.5 Impact on Existing Features
None.

### 2.6 Not in This Phase
- Auth, guards logic, Supabase queries (02)
- Sidebar and layout (03)
- Final motion values and visual design (design system)

### 2.7 Checklist: Before Marking Complete
- [x] Every route in `routing.md` resolves to a placeholder, and unknown URLs render `NotFoundPage` (router test covers all 19 routes plus the redirects)
- [x] Throwing inside a placeholder page renders `RouteErrorPage` (router test)
- [x] The theme toggle (`ThemeToggleButton` on every placeholder) switches system, light and dark, and persists across reloads (component test). No flash on load: an inline script in `index.html` sets the class before paint.
- [x] `supabase` client created; a missing env var gives a readable error (test)
- [x] Tests for `paths`, `dates` and `position` pass (plus `tint`)
- [x] `ConfirmDialog` with `requireText` blocks confirm until the text matches (component test)
- [x] No barrel files and no relative `../` imports
- [x] `npm run lint`, `npm test` (46 tests) and `npm run build` pass
- [x] `axon-rules` audit is clean
- [x] `00-index.md` status and changelog are updated

### Implementation Notes (Phase 2)
- **Design folded in early.** The design system was adopted after this doc was written, so this phase shipped real tokens instead of placeholders.
  - `src/index.css` has all colour tokens (light and dark), the 10 space hues, and `--space-accent` registered with `@property` and crossfaded via `[data-space-color]`.
  - Also in `index.css`: the `tint` utility, a `shimmer` utility, the type scale (`text-display/h1/h2/h3/read/ui/small/stat`), radius, shadows, motion CSS variables, and Geist Mono.
  - `presets.js` has the final motion values.
- **Theme uses `next-themes`**, not a hand-rolled provider. shadcn had already installed it and `sonner.jsx` depends on it, so the ui file needs no edit.
  - `components/theme/ThemeProvider.jsx` wraps it (storage key `axon-theme`), and `useTheme.js` normalises its output.
  - The inline script in `index.html` prevents the flash on load.
- **Router:** `routes` is exported for tests, and `router = createBrowserRouter(routes)`.
  - Pages load through a `page()` helper that uses route `lazy` and sets an `errorElement`. The root has `hydrateFallbackElement: <Splash/>`.
  - **All router APIs are imported from `react-router`.** Mixing in `react-router/dom` loaded two copies of the router context under Vitest, which broke `useRouteError`. A rule was added to `routing.md`.
  - `*` renders `NotFoundPage` eagerly. It's tiny, and `RouteErrorPage` imports it anyway.
  - `/s/:slug/todos` renders `TodosRedirect` to `tasks?tab=todos` (delta G1). `paths.space(slug).todos()` points there too.
- **Guards** (`RequireAuth`, `PublicOnly`, `SpaceBoundary`) are pass-through stubs. `RootRedirect` sends `/` to `/spaces`.
- **Added beyond the plan** (all from design delta G7 or needed by this phase):
  - `lib/tint.js` (`tintStyle`, `hueVar`, `HUE_KEYS`)
  - `components/shared/ErrorPage.jsx`, `AxonMark.jsx`, `ThemeToggleButton.jsx`
  - `features/system/components/PlaceholderPage.jsx`
  - motion `progressSweep` and `popIn`; `staggerContainer` became `staggerItem` (index passed through `custom`, first 8 items only), and the design system was updated to match
- **`lib/dates.js`** adds `dueTone()` (overdue, today, default or none), alongside `formatDueLabel()`. The `now` argument is injectable for tests. Week start isn't needed yet.
- **Edited shadcn file:** `components/ui/skeleton.jsx` uses `shimmer` instead of `animate-pulse`.
- **Test setup:** `src/tests/setup.js` stubs `matchMedia` and `ResizeObserver` for jsdom, and runs RTL `cleanup`.
- **Follow-up:** the main bundle is 613 kB minified (196 kB gzipped): React, router, motion and Radix. Add vendor chunk splitting (`build.rolldownOptions`) once the app shell lands in Feature 03.
- **Not done:** 404 and 500 omit the design's "Search ⌘K" button until Feature 12. The `vite-scaffold` copy is left in the scratchpad.

**Phase 2 is done. Waiting for approval.**

---

## Data Model Summary
No tables.

## Out of Scope (All Phases)
- Design tokens, fonts and the final motion spec: design system
- CI/CD and deployment (Vercel or Netlify): decide once Wave 1 ships
- Error monitoring (Sentry): backlog
