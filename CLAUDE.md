# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What Axon is

**Axon** is a personal "second brain OS": a single-user app for recording tasks, todos, notes, a daily journal, calendar events and quarterly reports, organised into **spaces**.

- The primary use is logging frontend work on the **THMP marketplace** project, per fiscal quarter. Personal-life spaces sit alongside it.
- There is **no multi-tenancy**. Every row belongs to the signed-in user (`user_id = auth.uid()`). Signup is open, but users never see each other's data.
- The architecture for tasks, todos and notes is adapted from the Tercero app (`C:\Users\chris_austin\Desktop\social-media-management`). Its workspace, agency and RBAC layers are deliberately dropped.

## Status

See `.claude/features/00-index.md` for the roadmap, the build status and the changelog. As of 2026-09-25:

| Feature | State |
|---|---|
| 01 Foundation | ✅ Complete |
| 02 Auth, profile and settings (fiscal year) | ✅ Complete |
| 03 Spaces gallery, app shell, Global | ✅ Complete |
| 04 Tasks | ✅ Complete, plus many browser-feedback follow-ups on 2026-09-25 (see the changelog) |
| 05 Todos | ✅ Complete (page, groups, reorder, task checklists) |
| 06 Notes | ✅ Complete (editor, list, autosave, pinning, versions, tag chips, code highlight, tables, Markdown, shortcuts, rich task descriptions) |
| 07 Task detail and linking | 🟡 Phases 1–2 ✅ (task detail page, activity and work log, manual note ↔ task links); **Phase 3 (`[[` mentions) is next** |
| 08–14 | Planned (docs in `.claude/features/`) |
| 15 Attachments and Media | 🟡 Phase 1 ✅ (images in notes and task descriptions, private bucket, signed URLs); Phases 2–3 later |

### Resume here (session handoff)

1. **Next step: Feature 07 Phase 3 (`[[task]]` mentions, `sync_note_mentions`, "Make task" in the bubble menu per D2), after the user approves Phase 2.** Tests run with `maxWorkers: 2` (the suite takes about 4 minutes). Feature 15 Phases 2–3 (task file attachments, space images) wait until later.
   - Run the `axon-feature` skill, Step 4, on `.claude/features/06-notes.md`. Phase 1's Implementation Notes (§1.8) cover the Tiptap 3.31 specifics.
   - Phase 2 covers the tag filter, table controls, lowlight code blocks, Copy as Markdown, Ctrl+S and the shortcuts cheat sheet. Phase 3 turns the task dialog's description into a compact `RichTextEditor`; pass the suggestion `container` option inside the Dialog.
   - **Still to confirm in the browser:**
     - The note editor: the bubble menu, "Turn into", the slash menu, and discard-on-leave of an empty note.
     - Todo drag reorder (pointer and keyboard).
   - Supabase MCP tools didn't load in the 2026-09-25 session; the Management API fallback worked (see item 3).
2. **Workflow the user expects:**
   - Build one phase, verify it (lint, tests, build, the `axon-rules` audit), and update the feature doc, `00-index.md` and the patterns catalogue.
   - **Then commit and push to `main`** (github.com/Shanks026/axon-personal-os), and stop for approval.
   - The user tests in the browser and reports UI issues, often several at once, mid-turn. Fix them promptly and record each preference in `.claude/rules/`.
3. **Database access:**
   - Use the Supabase MCP tools (they load at session start).
   - If they're missing, use the Management API fallback in `.claude/rules/supabase.md`. The token is in `~/.claude.json` under this project's `mcpServers.supabase.env`. Never print it.
   - A small Node helper that reads the token and calls the API works well; write it to the scratchpad.
     - **Git Bash rewrites an argument starting with `/` into a Windows path**, so pass API paths without the leading slash (`database/query`) and add it in the script.
   - Verify with rolled-back transactions, and mirror every migration in `supabase/migrations/` using the server version (`select version from supabase_migrations.schema_migrations`).
4. **Environment:**
   - The dev server runs at http://localhost:6420 (`DEV_PORT`).
   - It's Windows, with Git Bash and PowerShell. There's no `python`; use Node for scripted edits.
   - With `node -e` inside bash double quotes, **backticks run as shell commands**. Use the Edit/Write tools for any text containing backticks.
   - **Tailwind silently drops invalid or template-built class names** (the `border-1.5` bug). After adding unusual classes, grep `dist/assets/index-*.css` to confirm they were generated.
5. **UI decisions made during the build** (all recorded in `.claude/rules/`):
   - Typography: Tailwind/shadcn default type (`text-sm` body). Dialog headers use shadcn's default `DialogTitle`/`DialogDescription` with no extra classes.
   - Spaces: emoji identity shown bare (no tile); space images wait for Feature 15.
   - Sidebar: 16rem wide, 3rem rail; same background as the page (white in light, `#0b0b0b` in dark), separated by the hairline border.
   - Shadows: very subtle everywhere. Scrollbars: thin and themed, app-wide (`index.css`).
   - Overlays: no backdrop blur (it caused frame drops); scaling dialogs get `will-change-transform`. Tall dialogs use `max-h-dialog`, with pinned header and footer and a scrolling body.
   - Shortcut hints: the `<Kbd>` component, with lucide Command icons.
   - Destructive actions: always the shadcn `destructive` variant.
   - Pages: eager, inside one persistent `AppShell` whose content column is the only scroll container; no route-loading splash.
   - Signup has a confirm-password field, the password minimum is 10, and email confirmation is off in Supabase.
   - **Badges and pills** (status, priority, tags) use literal Tailwind colour-scale classes from `lib/tint.js` (`bg-*-100 text-*-700`). Tags can use all 26 Tailwind palettes; spaces keep the CSS-variable accent.
   - **Status colours:** To do slate, In progress blue, In review violet, Blocked pink, On hold amber, Completed emerald, Cancelled red. Priority is a plain dot.
   - **No space pickers.** Tasks, tags and notes belong to the space they're created in; in Global they go to the default space.
   - Menus opened on hover must be `modal={false}`. Hover popovers use `useHoverOpen` (dialog chips) or shadcn `HoverCard` (the tag "+n").
   - Closed task titles keep full contrast (no strike-through); only todos strike through.

- **Design system v1 is set.** It comes from Claude Design, and its source files are in `.claude/design/Axon design system built/`.
  - `.claude/rules/design-system.md` holds the tokens, motion and component specs. It will be refined as the build goes on.
  - `.claude/design/design-deltas.md` lists where the design differs from the feature docs. Fold those differences into each feature's doc before building it.

## Tech stack

| Concern | Choice |
|---|---|
| UI | React 19, plain **JavaScript** (`.jsx`, no TypeScript) |
| Build | Vite, with the `@` alias pointing to `./src` |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) and shadcn/ui (latest CLI, lucide icons) |
| Motion | `motion` (the Framer Motion successor, imported as `motion/react`) |
| Routing | React Router v7 (data router, `createBrowserRouter`) |
| Server state | TanStack Query v5 |
| Forms | react-hook-form with zod |
| Backend | Supabase (Postgres, Auth, RLS, RPC, later Storage and Edge Functions) |
| Editor | Tiptap (rich text for notes, journal, task descriptions and reports), with lowlight for code blocks |
| Drag and drop | `@dnd-kit/core` and `@dnd-kit/sortable` |
| Data tables | `@tanstack/react-table` **v9** (`useTable` + `tableFeatures`; v8 `useReactTable` examples don't apply) on shadcn `table` |
| Dates | `date-fns` with `@date-fns/tz` (calendar maths runs in `profiles.timezone`) |
| Charts | shadcn charts (built on Recharts) |
| Command palette | `cmdk` (through the shadcn `command` component) |
| Toasts | `sonner` |
| Hotkeys | `react-hotkeys-hook` |
| Tests | Vitest with Testing Library (jsdom) |
| Lint / format | oxlint (`.oxlintrc.json`, enforces hooks rules and import boundaries) and Prettier (with the Tailwind class-sorting plugin) |

Version notes:
- **React Router** is pinned to v7. v8 needs Node 22.22 or newer, and the machine has 22.13.
- **shadcn** v4 uses the `radix-nova` style and the `cn` package (re-exported from `@/lib/utils`). Forms use its `field` primitives.

## Commands

```bash
npm run dev        # Vite dev server
npm run build      # production build
npm run lint       # oxlint
npm run format     # Prettier
npm test           # vitest run
```

## Environment

`.env.local` is git-ignored:

```
VITE_SUPABASE_URL=https://ceomotoumlljqlkqboyc.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
DEV_PORT=6420            # dev and preview port (strictPort). Never 5173 or the 3000/5000 ranges.
```

The app runs at **http://localhost:6420**. Supabase Auth's Site URL and Redirect URLs point there.

- Only the publishable key ever reaches the client. The service role key and personal access tokens never go in the repo.
- The Supabase MCP server (`supabase`) is configured in local Claude config for project `ceomotoumlljqlkqboyc`.
  - Use it for migrations (`apply_migration`), running SQL and advisors.
  - Run `get_advisors` (security) after every DDL change.

## Core concepts

- **Space.** A named realm (for example "THMP" or "Personal"). Every task, todo, note, event and journal entry belongs to exactly one space.
- **Global.** A virtual space, not a database row, served at `/s/global/...`.
  - It aggregates every non-archived space.
  - Items in it show a space badge.
  - Create dialogs in Global require picking a space.
  - Reports and inbox items may have `space_id = NULL`, meaning global.
- **Scope.** `useSpace()` exposes `scopeSpaceIds`: `[currentSpace.id]`, or every active space id in Global. Every space-scoped query takes `spaceIds` and filters with `.in('space_id', spaceIds)`. This one mechanism makes Global work everywhere.
- **Tasks vs todos.** They are separate tables and separate pages: **Tasks** (`/tasks`) and **Todos** (`/todos`). The design merged them into one module; that was reversed on 2026-09-24 because todos share almost none of the Tasks page's controls.
  - A task is tracked work with a status, priority, dates, tags, a rich description, linked notes and an activity log.
  - A todo is a quick checkbox. It either stands alone or sits on a task as a checklist item (`todos.task_id`).
- **Notes ↔ tasks.** Links are many-to-many (`note_task_links`) and come from two sources:
  - Manual links.
  - Inline `[[task]]` mentions in the editor, synced by RPC.
- **Fiscal quarters.** Quarters are computed from `profiles.fy_start_month`. The default is 4 (April, so Q1 = Apr–Jun) and it is user-configurable. Reports and dashboards use `src/lib/fiscal.js`; nothing stores a quarter except report metadata.
- **Soft delete.** User-facing deletes set `deleted_at` and show an Undo toast. The Trash page (Feature 14) restores or purges. Spaces are the exception: they are archived, or permanently deleted after typing their name to confirm.

## Architecture

```
Page (thin) → feature components → feature api.js hooks → supabase client → Postgres (RLS)
                                     ↑
                             TanStack Query cache
```

- Code is organised by **feature** under `src/features/<feature>/`. Shared building blocks live in `src/components/`, `src/hooks/` and `src/lib/`.
- Only `src/lib/supabase.js`, `src/features/*/api.js` and `src/context/AuthContext.jsx` may import the Supabase client.
- The URL is the source of truth for the active space (`/s/:spaceSlug/...`), and for filters and search params.

Detailed rules live in `.claude/rules/`. They load automatically when you touch matching files:

| Rule file | Covers |
|---|---|
| `project-structure.md` | Folder layout, file naming, import boundaries |
| `components.md` | Component authoring, dialogs, forms, loading and empty states |
| `data-and-hooks.md` | `api.js` pattern, query keys, mutations, custom hooks |
| `routing.md` | Route tree, the `paths` helper, space scoping, guards |
| `supabase.md` | Migrations, RLS, ownership FKs, RPCs, soft delete |
| `design-system.md` | Tokens (colour, type, spacing, radius, elevation), motion, layout and component specs (v1) |

The full database design (all tables, all phases) is in `.claude/docs/data-model.md`.

## Workflow

- **New or continued features.** Use the `axon-feature` skill (`.claude/skills/axon-feature/`). A feature doc in `.claude/features/` must exist and be approved before any code is written. Build one phase at a time and stop for approval after each.
- **Before marking a phase complete.** Run the `axon-rules` skill to self-audit the changed files against `.claude/rules/`.
- **Tracking.** Every change that lands updates `.claude/features/00-index.md`: the feature status, the DB registry and a changelog entry. New layouts or plans are recorded there too.
- **Migrations.** Apply them through the Supabase MCP and mirror each one to `supabase/migrations/<timestamp>_<name>.sql` with identical SQL.
