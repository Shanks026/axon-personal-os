# Feature 03: Spaces, Global View and App Shell

**Product**: Axon, a personal second-brain OS
**File**: `.claude/features/03-spaces-and-shell.md`
**Status**: 🟡 Phase 1 ✅ · Phase 2 next
**Depends on**: 02
**Last Updated**: September 2026

---

## Context

A **space** is the realm that holds all the data, for example "THMP" (work) or "Personal".

- After signing in, the user lands on a full-screen **space gallery** of cards. If they have no spaces, the gallery asks them to create their first one.
- Opening a space enters the **app shell**: a sidebar with a space switcher. The switcher lists every space plus **Global**, a virtual aggregate of all active spaces.
- "Manage spaces" returns to the gallery, where spaces can be added, edited, reordered, archived or deleted.

This feature builds the `scopeSpaceIds` mechanism that every later feature relies on.

---

## Phase Overview

```
Phase 1: Spaces gallery
  spaces table, /spaces full-screen gallery with cards, create/edit dialog, reorder, archive, permanent delete.

Phase 2: App shell and Global
  SpaceContext + SpaceBoundary, /s/:spaceSlug layout with sidebar, space switcher (incl. Global),
  page header system, last-space memory, RootRedirect, placeholder section pages.
```

**After each phase, stop and wait for approval.**

---

## Phase 1: Spaces Gallery ✅ Complete

### Goal
At `/spaces` the user sees their spaces as animated cards, or an inviting empty state with "Create your first space". They can:
- Create a space: name, auto-generated slug (editable), description, colour key and icon.
- Edit it.
- Drag cards to reorder them.
- Archive or unarchive it (archived spaces sit in a collapsed "Archived" section).
- Permanently delete it, after typing the space name to confirm. This deletes everything inside it.

Clicking a card enters `/s/<slug>`, which is a placeholder until Phase 2.

### Before Starting: Confirm With Codebase
1. Feature 02 is complete. `useAuth` and `profileKeys` exist, and `/spaces` is a placeholder page.
2. `ConfirmDialog` supports `requireText` (Feature 01).
3. Check the current dnd-kit sortable grid API (`rectSortingStrategy`).
4. Decide the icon set: a curated list of about 30 lucide icon names in `features/spaces/constants.js`. Store the name, and render through an `ICONS` map (no dynamic import of all of lucide).
5. The colour keys list (`SPACE_COLORS`) is placeholder until the design system maps keys to tokens.

### 1.1 Database
Migration `create_spaces`: the SQL from `data-model.md` **spaces**, including the `profiles.last_space_id` FK.

Verify:
- A slug of `global` is rejected.
- A duplicate slug for the same user is rejected.
- Deleting a space sets `profiles.last_space_id` to null.

### 1.2 API Layer
`src/features/spaces/api.js`:

| Export | Details |
|---|---|
| `spaceKeys` | `{ all: ['spaces'], list: () => ['spaces','list'] }`. There is one list containing every space, including archived ones, because the count is small and it is needed everywhere. |
| `fetchSpaces()` / `useSpaces()` | select `*` order by `position` |
| `createSpace({ name, slug, description, color, icon })` / `useCreateSpace()` | `position = positionAfterLast` |
| `updateSpace(id, patch)` / `useUpdateSpace()` | optimistic for reorder and archive |
| `deleteSpace(id)` / `useDeleteSpace()` | hard delete. Invalidates **everything** (`qc.invalidateQueries()`), because every feature's data cascades. |
| `setLastSpace(spaceId)` | updates `profiles.last_space_id`, fire-and-forget, errors ignored with a console warning |

`src/features/spaces/utils.js`: `slugify(name)` (lowercase, dashes, ≤ 48 characters, never `global`, so it becomes `global-1`) and `uniqueSlug(base, existingSlugs)`. Both are tested.

### 1.3 Components

```
src/features/spaces/
├── api.js
├── constants.js                  # SPACE_COLORS, SPACE_ICONS
├── schemas.js                    # spaceSchema (name 1–60, slug regex, description ≤ 280, color, icon)
├── utils.js
├── components/
│   ├── SpaceCard.jsx             # icon + name + description + (later) counts; hover lift; menu (Edit, Archive, Delete)
│   ├── SpaceGrid.jsx             # dnd-kit sortable grid of SpaceCards + "New space" ghost card
│   ├── SpaceDialog.jsx           # create/edit; slug auto-follows name until edited manually
│   ├── ColorPicker.jsx
│   ├── IconPicker.jsx            # popover grid, searchable
│   └── DeleteSpaceDialog.jsx     # ConfirmDialog with requireText = space.name, lists what will be deleted
└── pages/SpacesPage.jsx          # /spaces — full-screen; header with logo, user menu (Settings, Sign out)
src/components/shared/
├── SpaceIcon.jsx                 # renders icon key in the space's accent
└── SpaceBadge.jsx                # small pill (icon + name) — used in Global lists from Feature 04
```

- **Empty state:** a large centred illustration or icon with "Create your first space", a short explainer ("Spaces keep work and life separate. Global shows everything."), and a primary button.
- **Motion:** cards stagger in on first load, and animate `layout` on reorder, create and delete.
- **Global card:** a distinct first card, "Global: everything in one place". It's disabled until at least one space exists, and navigates to `/s/global`.

### 1.4 Routes and Integration
- `/spaces` renders `SpacesPage` (under `RequireAuth`).
- The `SpacesPage` user menu links to `/settings`.

### 1.5 Impact on Existing Features
| Existing feature | Impact | Action |
|---|---|---|
| 02 profiles | New FK `last_space_id` | Included in the migration |

### 1.6 Not in This Phase
- The sidebar shell and Global view pages (Phase 2)
- Item counts on cards (added as each feature lands, using a lightweight count query)

### 1.7 Checklist: Before Marking Complete
- [x] The migration is applied (`20260923171644`) and mirrored; the only advisor findings are Supabase's own `rls_auto_enable`. Constraint checks were verified in a rolled-back transaction:
  - `global`, a duplicate slug for the same user, and a malformed slug are rejected.
  - The same slug for another user is allowed.
  - Deleting a space sets `last_space_id` to null.
  - RLS hides and blocks other users' spaces, and `user_id` defaults to `auth.uid()`.
- [x] The empty state shows for a new user. Creating a space animates the card in; the first space ever also navigates into it (test).
- [x] The slug is auto-generated from the name (avoiding clashes with `-2`), and can be edited through the chip and pencil and validated. A duplicate slug typed by hand shows an inline error (test).
- [x] Reordering: dragging by the grip saves a fractional `position`, applied optimistically. `reorderPosition` is tested. **A reload check in a real browser is still needed.**
- [x] Archive and unarchive move cards between sections, with an Undo toast (test)
- [x] Delete requires typing the exact name (case-sensitive), then the card animates out (test)
- [x] Clicking a card navigates to `/s/<slug>/dashboard` and records `last_space_id` (test)
- [x] `slugify`, `uniqueSlug`, `splitSpaces`, `reorderPosition` and schema tests pass
- [x] `npm run lint`, `npm test` (131 tests) and `npm run build` pass; `axon-rules` is clean
- [x] `00-index.md` DB registry, status and changelog are updated

### Implementation Notes (Phase 1)
- **Adopted from delta 03 (gallery):**
  - Layout: max-width 1040, 3 columns, gap 16, 176px cards with a 14px radius. "Your spaces" and "Drag to reorder" at the top.
  - The Global card comes first, muted, showing "N spaces". A dashed "New space" ghost card and a collapsed "Archived N" row follow.
  - Cards show the grip handle only on hover or focus, and have a `…` menu with Edit, Archive/Unarchive and Delete.
  - The 520px dialog: an icon tile beside the name, the `axon.app/s/` slug chip with a pencil, 10 colour swatches, an inline searchable 9-column icon grid (35 curated icons), and ⌘↵ to submit.
  - The empty state has three tilted ghost tiles on the gentle spring.
- **Deviation: card counts.** The counts ("5 open tasks · 4 notes") and the delete dialog's six count tiles are **not shown yet**, because the tables they count don't exist. Cards show "Since 23 Sep" (or "Archived …") in that slot instead. Features 04 and 06 add a counts query and fill the slot and the tiles.
- **Behaviour:**
  - Creating the **first** space navigates straight into it. Later creations stay on the gallery.
  - Opening any card records `profiles.last_space_id` (fire-and-forget).
  - Archiving shows an Undo toast.
  - Delete is a hard delete and invalidates every query.
- **Accessibility:** each card is a full-size overlay `Link` ("Open THMP"). The grip and the menu sit above it with `pointer-events-auto`, so nothing interactive is nested inside the link. dnd-kit keyboard sorting is enabled.
- **Structure:**
  - `SpaceDialog` renders its form inside `DialogContent`, which unmounts on close, so each open is fresh with no reset effect.
  - `useWatch` is used instead of `form.watch`, which is compatible with the React Compiler.
  - `reorderPosition` is a pure util, so the grid only wires up dnd-kit.
- **Shared components added:**
  - `components/shared/SpaceIcon.jsx`: an accent tile, sizes xs/sm/md/lg, with a `global` variant.
  - `components/shared/SpaceBadge.jsx`
  - `components/shared/spaceIconMap.js`: the curated lucide map plus `GLOBAL_ICON`.
  - `components/layout/UserMenu.jsx`: name and email, a theme submenu, Settings, and Sign out. The sidebar reuses it in Phase 2.
- **Removed:** the temporary `SignOutButton` on `/spaces`; the `UserMenu` replaces it. The component itself is kept for reuse.
- **Tests:**
  - `src/tests/features/spaces/utils.test.js` and `SpacesPage.test.jsx`, which uses an in-memory fluent Supabase mock.
  - `router.test.jsx` now mocks Supabase to return an empty space list.

**Stop here. Show the result and wait for approval.**

---

## Phase 2: App Shell and Global

### Goal
`/s/:spaceSlug/*` renders the app layout:

- **Sidebar:**
  - **Header:** the space switcher. It lists Global and then all active spaces with their icons, and offers "New space…" and "Manage spaces…".
  - **Primary nav:** Dashboard, Inbox, Tasks, Todos, Notes, Journal, Calendar, Reports.
  - **Pinned** section (empty until Feature 14).
  - **Footer:** Trash, Settings and the user menu (theme, sign out).
- **Main area:** a page header (title, breadcrumbs, actions) and the page content, with a page transition.

Switching space keeps the current section (Tasks in THMP → Tasks in Personal). The last space is remembered, and `/` redirects there. Unknown or archived slugs show a friendly not-found state. Section pages are placeholders that already read `scopeSpaceIds`.

### Before Starting: Confirm Phase 1 Is Approved
1. Phase 1 is `✅ Complete`.
2. Check the current shadcn `sidebar` component API: `SidebarProvider`, `Sidebar collapsible="icon"`, `SidebarInset` and `useSidebar`.
3. Confirm the layout decisions with the approved design, **if it is ready**. Otherwise build the structure with shadcn defaults and flag the layout for a design pass.

### 2.1 Database
No database changes.

### 2.2 Context, Hooks and API

- **`src/context/SpaceContext.jsx`**: `SpaceProvider({ spaceSlug, children })` builds the shape in `axon-data-patterns.md` §1 from `useSpaces()`. `useSpace()` throws outside the provider.
- **`src/features/spaces/hooks/useSpacePaths.js`**: returns `paths.space(currentSlug)`.
- **`src/features/spaces/hooks/useSwitchSpace.js`**: `switchTo(slug)` keeps the current section segment. Detail routes (`tasks/:id`) fall back to their list route. It also calls `setLastSpace` and writes `localStorage['axon:lastSpaceSlug']`.
- **`RootRedirect`** in `routes/guards.jsx` resolves in this order:
  1. The profile's `last_space_id` (if the space is still active).
  2. The `localStorage` slug.
  3. The first active space.
  4. `/spaces`.

### 2.3 Components

```
src/components/layout/
├── AppLayout.jsx                 # SidebarProvider + AppSidebar + SidebarInset(PageHeader + <AnimatePresence mode="wait"><Outlet key={pathname}/></AnimatePresence>)
├── AppSidebar.jsx
├── SpaceSwitcher.jsx             # DropdownMenu/Command hybrid; Global first; shortcut hint (Ctrl+Shift+S? — final in Feature 12)
├── NavMain.jsx                   # section links via useSpacePaths, active state from location
├── NavPinned.jsx                 # placeholder list (Feature 14)
├── NavFooter.jsx                 # Trash, Settings, UserMenu
├── UserMenu.jsx                  # avatar initials, theme submenu, Settings, Sign out
├── PageHeader.jsx
└── PageHeaderContext.jsx         # PageHeaderProvider + usePageHeader({ title, breadcrumbs, actions })
src/routes/guards.jsx             # + SpaceBoundary (resolves slug; wraps SpaceProvider; not-found state)
src/features/<section>/pages/*Page.jsx  # placeholders now call usePageHeader + show EmptyState "Coming soon" with scope info
```

- **Global visual cue:** the switcher shows a distinct Global icon, and the page header shows "Global" with the total count of active spaces.
- **Space accent:** `AppLayout` sets `data-space-color={space.color}` on the shell root, so the design system can theme accents per space later.
- **Collapsed sidebar:** icon-only, with tooltips. The state persists through `useLocalStorage('axon:sidebar')`, or through shadcn's cookie mechanism, adapted to localStorage.
- **Mobile:** the sidebar becomes a sheet (shadcn default). A trigger goes in the page header.
- **Motion:** section changes fade and slide via `PageTransition`. The switcher menu animates. When the space changes, the accent cross-fades.

### 2.4 Routes and Integration
- Route `/s/:spaceSlug` renders `SpaceBoundary`, then `AppLayout` with children (index goes to `dashboard`, plus all section routes).
- `/` renders `RootRedirect`.
- `SpacesPage` card clicks and the Global card use `useSwitchSpace` semantics (last space recorded).
- `SpaceDialog` is reused from the switcher's "New space…". On success it navigates into the new space.

### 2.5 Impact on Existing Features
| Existing feature | Impact | Action |
|---|---|---|
| 01 router | Section placeholders move under the layout route | Update `router.jsx` |
| 02 settings | Back button target | Use the last space |

### 2.6 Not in This Phase
- Real section content (Features 04+)
- Command palette and shortcuts (12); quick capture (13); pinned items (14)

### 2.7 Checklist: Before Marking Complete
- [ ] `/s/<slug>/tasks` renders the layout with the Tasks placeholder showing `scopeSpaceIds` (dev-only debug line)
- [ ] `/s/global/tasks` has `isGlobal = true`, and `scopeSpaceIds` equals all active space ids
- [ ] An unknown or archived slug shows the not-found state with a link to `/spaces`
- [ ] Switching space keeps the section; switching from a detail route falls back to the list
- [ ] `/` goes to the last used space; with zero spaces it goes to `/spaces`
- [ ] The sidebar collapses to icons, persists, and works as a sheet on mobile widths
- [ ] Page transitions play on section change, and nothing animates on the first paint
- [ ] `usePageHeader` sets the title and breadcrumbs on every placeholder
- [ ] `npm run lint`, `npm test` and `npm run build` pass; `axon-rules` is clean
- [ ] `00-index.md` status, changelog and new shared components are updated (also in `axon-data-patterns.md` §10)

**Stop here. Show the result and wait for approval.**

---

## Data Model Summary

```
auth.users 1 ── n spaces (slug unique per user; 'global' reserved)
profiles.last_space_id ──► spaces.id (on delete set null)
```

### `spaces`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK; `unique(id, user_id)` for composite FKs |
| `user_id` | uuid | default `auth.uid()` |
| `name` | text | 1–60 |
| `slug` | text | URL key; regex; ≠ `global`; unique per user |
| `description` | text | ≤ 280 |
| `color` | text | accent key (design tokens later) |
| `icon` | text | lucide icon key from the curated list |
| `position` | double | fractional ordering |
| `archived_at` | timestamptz | archived spaces are hidden from Global and the switcher |

## Out of Scope (All Phases)
- Space templates (e.g. a "Work" template with preset tags): backlog
- Per-space settings (a default task view, custom statuses): backlog
- Sharing a space with another user: never (single-user by design)
