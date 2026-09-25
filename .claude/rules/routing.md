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
/s/:spaceSlug                      ← SpaceBoundary (404 guard) inside AppShell (sidebar shown); index → dashboard
    dashboard
    inbox
    tasks            tasks/:taskId        (?tab=all|<status>&view=grid|board|table&sort=<col>|-<col>&version=…)
    todos                                  (standalone Todos page, Feature 05; ?highlight=<id>)
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
- **Pages are imported eagerly, never with `lazy`.** Lazy chunks made the previous screen linger, or a half-ready one flash, while code loaded (the user reported this as flicker). Vendor libraries are split into cached chunks in `vite.config.js` instead. The root and the shell have an `errorElement`.
- **`AppShell` is the single persistent frame** for every signed-in screen (`/`, `/spaces`, `/settings`, `/s/*`), modelled on Tercero:
  - It resolves the space from the URL and provides `SpaceContext`.
  - The sidebar slot only fills inside a real space.
  - The content column is the **only** scroll container (`h-svh overflow-y-auto scrollbar-stable`), and it scrolls to the top on navigation.
  - First load renders a blank background until spaces and the profile are loaded. A latch then keeps the shell mounted for good.
  - New full-screen pages (like the gallery) go inside it without a sidebar, not beside it.
- **No splashes for route or auth loading.** Guards render a plain `bg-background` block. `Splash` is only for pages that genuinely wait on a network step (the email-link callback, the reset link check).
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

- Each page inside the shell calls `usePageHeader({ title, actions? })` from `@/components/layout/PageHeaderContext`.
  - The breadcrumb (space › title) comes from the space context, so pages only pass their own title.
  - Keep `actions` stable (memoise, or define the JSX once) when it holds heavy content.
- **Pages never animate themselves.** `AppShell` fades each new page in (opacity only, keyed by pathname), with no exit animation.
- **The space accent lives on `<html data-space-color>`,** set by `AppShell`, so portalled menus and dialogs inherit it. Outside a space and in Global, it's `slate`.
- Filters, view mode and dates go in search params (see `data-and-hooks.md`). Use `replace: true` when a param changes while typing.
