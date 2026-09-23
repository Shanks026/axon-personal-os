---
paths:
  - "src/routes/**"
  - "src/lib/paths.js"
  - "src/features/**/pages/**"
  - "src/components/layout/**"
---

# Routing

## Route tree (`src/routes/router.jsx`)

```
/login  /signup  /forgot-password  /reset-password  /auth/callback   ← PublicOnly (except callback/reset)
/                                  ← RootRedirect: last space dashboard, else /spaces
/spaces                            ← full-screen space gallery (create / edit / archive / delete)
/settings/:section?                ← full-screen settings (profile, preferences, account)
/s/:spaceSlug                      ← SpaceBoundary + AppLayout (sidebar); index → dashboard
    dashboard
    inbox
    tasks            tasks/:taskId        (Tasks & Todos module: ?tab=all|tasks|todos|in_progress|completed&view=grid|board|list)
    todos            → redirect to tasks?tab=todos (no standalone page; design delta G1)
    notes            notes/:noteId
    journal          journal/:date        (date = yyyy-MM-dd)
    calendar                               (?view=month|week|day|agenda&date=yyyy-MM-dd)
    reports          reports/:reportId
    trash
*                                  ← NotFoundPage
```

- `:spaceSlug` is a space's `slug`, or the reserved `global` for the Global view. The DB check constraint forbids a space slugged `global`.
- `SpaceBoundary` resolves the slug. An unknown or archived slug renders the NotFound state with a link back to `/spaces`.
- Entity routes (`tasks/:taskId`) work in any scope. If the entity belongs to a different space than the URL says, redirect to its canonical space URL.
- Page routes are lazy-loaded with the `page(() => import(...))` helper in `router.jsx`, and each has an `errorElement`.
- Import every router API from **`react-router`**, never from `react-router/dom` or `react-router-dom`. Mixing entry points loads two copies of the router context, which breaks `useRouteError` and friends.

## Building URLs

Always use `@/lib/paths.js`, never template strings in components:

```js
paths.spaces()                         // '/spaces'
paths.space(slug).tasks()              // '/s/thmp/tasks'
paths.space(slug).task(id)             // '/s/thmp/tasks/<id>'
paths.space(slug).journal('2026-09-23')
```

Inside the app shell, use `useSpacePaths()`, which binds the current slug: `const p = useSpacePaths(); <Link to={p.notes()} />`.

## Auth flow

- `AuthContext.loading` means render the splash, never redirect.
- No session plus a protected route means `<Navigate to="/login" state={{ from: location }} replace />`.
- A session plus a public-only route means redirect to `/`.
- After an **explicit sign-in**, navigate to `/spaces` so the user picks a space. When the app opens with an existing session, `RootRedirect` goes to the last used space: `profiles.last_space_id`, falling back to `localStorage`, then to `/spaces`.
- A user with zero spaces is always sent to `/spaces`, which shows the "create your first space" empty state.

## Page conventions

- Each page calls `usePageHeader({ title, breadcrumbs?, actions? })` from `@/components/layout/PageHeaderContext`.
- Wrap page content in `<PageTransition>` from `@/components/motion`. The layout's outlet is keyed by pathname so page transitions play.
- Filters, view mode and dates go in search params (see `data-and-hooks.md`). Use `replace: true` when a param changes while typing.
