# Feature 02: Auth, Profile and Preferences

**Product**: Axon, a personal second-brain OS
**File**: `.claude/features/02-auth-and-settings.md`
**Status**: ✅ Complete (the email flows are waiting on a browser check by the user)
**Depends on**: 01
**Last Updated**: September 2026

---

## Context

Axon is single-user per account with **open signup**. Supabase Auth (email and password) handles identity, and a `profiles` row holds preferences. The most important preference is **`fy_start_month`**: fiscal quarters drive reports and dashboards. It defaults to April (the user's company financial year) and can be changed. This feature adapts Tercero's `AuthContext` pattern (splash while loading, a single `onAuthStateChange` subscription) and drops the workspace, role and subscription resolution.

---

## Phase Overview

```
Phase 1: Authentication
  profiles table + trigger, AuthContext, guards, login/signup/forgot/reset/callback pages (no email confirmation).

Phase 2: Settings and fiscal year
  /settings (Profile, Preferences, Account), lib/fiscal.js with full tests, theme persisted to profile.
```

**After each phase, stop and wait for approval.**

---

## Phase 1: Authentication ✅ Complete (browser check of the email flows waiting on the user)

### Goal
A visitor can sign up and is signed in straight away (email confirmation is disabled in Supabase), log in, reset a forgotten password and log out. Protected routes redirect to `/login`, and auth pages redirect signed-in users away. A `profiles` row is created automatically for every new user. After an explicit login the user lands on `/spaces`, which is still a placeholder until Feature 03.

### Before Starting: Confirm With Codebase
1. Feature 01 is complete. `src/lib/supabase.js`, `routes/router.jsx`, `routes/guards.jsx` (stubs), `Splash` and `paths` all exist.
2. Check the current supabase-js v2 APIs: `signUp({ email, password, options: { data, emailRedirectTo } })`, `signInWithPassword`, `resetPasswordForEmail(email, { redirectTo })`, `updateUser({ password })`, `exchangeCodeForSession`, and whether the default flow is PKCE for the browser client.
3. Use the Supabase MCP to confirm the project has no existing `public.profiles` table or `on_auth_user_created` trigger (`list_tables`).
4. **Manual step for the user.** In the Supabase dashboard, under Auth → URL Configuration:
   - Site URL: `http://localhost:6420`.
   - Redirect URLs: add `http://localhost:6420/auth/callback` and `http://localhost:6420/reset-password`.
   - **Confirm email is disabled** (the user turned it off on 2026-09-23), so `signUp` returns a session immediately.
   Ask the user to set the two URL settings and confirm before testing (confirmation is already off).

### 1.1 Database
Migration `create_shared_helpers_and_profiles`: the SQL from `data-model.md` sections **00** (`pg_trgm`, `set_updated_at`) and **profiles** (table, trigger, RLS, `handle_new_user` plus the `on_auth_user_created` trigger).

- There is no insert policy on `profiles`, because rows are only created by the security-definer trigger.
- There is no delete policy, because rows are removed by the `auth.users` cascade.

Verify: insert a test user with the MCP `execute_sql` and confirm the profile row appears, or verify via the real signup flow. Then run advisors.

### 1.2 API Layer
`src/features/auth/api.js`:

| Function / hook | Purpose |
|---|---|
| `signUp({ fullName, email, password })` | `options.data = { full_name, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }`, `emailRedirectTo: origin + '/auth/callback'` |
| `signIn({ email, password })` | `signInWithPassword` |
| `signOut()` | also calls `queryClient.clear()` |
| `sendPasswordReset(email)` | `redirectTo: origin + '/reset-password'` |
| `updatePassword(password)` | `updateUser` |
| `profileKeys` | `{ all: ['profile'], me: () => ['profile','me'] }` |
| `fetchMyProfile()` / `useMyProfile()` | select `*` from profiles where `id = user.id` (enabled when there is a session) |

`src/context/AuthContext.jsx`:
- State: `session`, `user`, and `loading` (true until the first `getSession()` resolves).
- Subscribes once to `onAuthStateChange`, and unsubscribes on unmount.
- Exposes `{ session, user, loading, signOut }` through a memoised value.
- `useAuth()` throws outside the provider.
- `profile` is **not** stored in context. Consumers call `useMyProfile()`, so server state stays in React Query.

### 1.3 Components

```
src/features/auth/
├── api.js
├── schemas.js                    # loginSchema, signupSchema (name, email, password ≥ 10, no confirm field — delta 02), emailSchema, newPasswordSchema
├── components/
│   ├── AuthLayout.jsx            # full-screen split/centred layout, logo, motion entrance
│   ├── LoginForm.jsx
│   ├── SignupForm.jsx
│   ├── ForgotPasswordForm.jsx
│   ├── ResetPasswordForm.jsx
│   └── PasswordInput.jsx         # show/hide toggle
└── pages/
    ├── LoginPage.jsx             # /login  — on success navigate(state.from ?? paths.spaces())
    ├── SignupPage.jsx            # /signup — signUp returns a session → navigate to /spaces. Fallback: if no session comes back (confirmation re-enabled), show the check-email state
    ├── ForgotPasswordPage.jsx    # /forgot-password — always shows "If an account exists…" (no enumeration)
    ├── ResetPasswordPage.jsx     # /reset-password — requires recovery session; else "link expired" + resend
    └── AuthCallbackPage.jsx      # /auth/callback — exchanges code, then → /spaces; errors → /login?error=
```

- Every form uses RHF and zod, and shows inline errors.
- Supabase error messages are mapped to friendly copy in `features/auth/utils.js` (`mapAuthError`). For example, "Invalid login credentials" becomes "Email or password is incorrect". The "email not confirmed" error is still mapped ("Confirm your email first"), in case confirmation is ever turned back on.
- Links: Login ↔ Signup, and Login → Forgot password.

### 1.4 Routes and Integration
- `guards.jsx`:
  - `RequireAuth`: shows `Splash` while loading, otherwise `Navigate` to `/login` with `state.from`.
  - `PublicOnly`: redirects a signed-in user to `/`.
- `router.jsx`:
  - Wrap the auth routes in `PublicOnly`, except `/auth/callback` and `/reset-password`, which are reachable with a recovery session.
  - Wrap all app routes in `RequireAuth`.
- `App.jsx`: `AuthProvider` goes inside `QueryClientProvider` and around `RouterProvider`.
- A temporary sign-out button goes on the `/spaces` placeholder.

### 1.5 Impact on Existing Features
| Existing feature | Impact | Action |
|---|---|---|
| 01 router | Guards wrap routes | Replace the guard stubs |

### 1.6 Not in This Phase
- OAuth providers (Google or GitHub): backlog, a single toggle later
- Account deletion (needs an Edge Function with the service role): backlog
- Custom SMTP or email templates. Default Supabase mail is rate-limited, so point this out to the user as a manual follow-up.

### 1.7 Checklist: Before Marking Complete
- [x] The migration is applied (version `20260923164417`), mirrored, and advisors are clean for our objects. The one advisor warning is about `public.rls_auto_enable()`, Supabase's own event trigger, which isn't ours and can't be called over RPC.
- [x] Signup creates `auth.users` and `profiles` rows (with `timezone` from the browser). Verified with a trigger test against the database (the test user was removed), plus a form test for the metadata. It lands on `/spaces` through `PublicOnly`. **An end-to-end browser signup still needs the user.**
- [x] `/auth/callback` waits for the PKCE exchange, then goes to `/spaces`. Without a session or with `?error=`, it shows "That link didn't work" (router test).
- [x] Login with bad credentials shows a friendly error under the password field (form test). Good credentials land on `/spaces`, or on `state.from` (router test).
- [ ] Forgot password sends mail and the reset page updates the password. **Needs the user to set the Supabase URL config, then a real inbox.** The UI is covered: the check-inbox state with the resend countdown, the reset form for a recovery session, and the expired state (router test).
- [x] Refreshing on a protected route while signed in never flashes `/login`; it shows the splash only (router test for `loading`).
- [x] Signing out clears the React Query cache (`AuthContext.signOut`), and `RequireAuth` then redirects to `/login`
- [x] `useAuth` and `useMyProfile` work; no Supabase import outside `api.js`, `lib` or `AuthContext` (audit and oxlint)
- [x] `npm run lint`, `npm test` (63 tests) and `npm run build` pass; `axon-rules` is clean
- [x] `00-index.md` DB registry, status and changelog (including the manual dashboard steps) are updated

### Implementation Notes (Phase 1)
- **The Supabase MCP tools weren't loaded in this session.** The server was registered mid-session, and tools load at startup. Migrations and queries went through the **Supabase Management API** instead, which is the API the MCP wraps. `POST /v1/projects/{ref}/database/migrations` records history in `supabase_migrations.schema_migrations`, just like `apply_migration`. The local mirror file uses the server-assigned version. After a Claude Code restart, the MCP tools are available.
- **Migration addition:** `revoke execute on function public.handle_new_user() from public, anon, authenticated`. It's a trigger-only security-definer function, so it must not be callable through RPC. `data-model.md` is updated.
- **Database verified by:**
  - A trigger test: insert into `auth.users`, confirm a profile appears with the name, the time zone and the defaults (FY month 4, week start 1, theme system). The test rows were deleted afterwards.
  - An RLS test in a transaction that rolled back: a user sees only their own row, updating someone else's profile touches 0 rows, and updating their own touches 1.
- **Auth client:** `flowType: 'pkce'`, since the default is `implicit`. Email links carry `?code=`, which `detectSessionInUrl` exchanges while `getSession()` runs. That's why `AuthContext.loading` covers both the callback and the reset pages.
- **Navigation after login and signup** is handled only by `PublicOnly`. When the session appears, it redirects to `state.from`, or to `/spaces`. The forms never call `navigate` themselves, so there's no race.
- **Adopted from delta 02:**
  - Signup has no confirm-password field, and the password minimum is 10 (72 is the bcrypt maximum).
  - Login errors appear under the password field ("That password doesn't match this email.").
  - "Forgot?" sits on the label row.
  - Reset shows "For <email>".
  - A split layout: an 11/24-width brand panel, hidden below `md`, and a 360px form.
  - The check-inbox state with a 60-second resend countdown, used by forgot password (and by signup as a fallback).
- **Email confirmation is disabled** (the user's decision). Signup returns a session. If it ever doesn't, `SignupForm` calls `onNeedsConfirmation` and the page shows the check-inbox state.
- **New files:**
  - `src/context/AuthContext.jsx`
  - `src/features/auth/`: `api.js` (with `useSignUp`, `useSignIn`, `useSendPasswordReset`, `useUpdatePassword`, `useMyProfile`), `schemas.js`, `utils.js` (`mapAuthError`) and `components/` (`AuthLayout` + `AuthHeading`, `AuthTextField`, `PasswordInput`, `FormAlert`, `CheckInbox`, the four forms, `SignOutButton`)
  - The five pages
- **Tests:** `src/tests/features/auth/auth.test.jsx` covers schemas, `mapAuthError`, and LoginForm and SignupForm with a mocked Supabase. `router.test.jsx` now mocks `AuthContext` and covers signed-in, signed-out and loading states. Vitest gets fake `VITE_SUPABASE_*` values (`vite.config.js` → `test.env`).
- **Lint:** an oxlint override turns off `only-export-components` for `src/context/**`, because contexts intentionally export both the provider and `useX`.
- **Changed during this phase at the user's request:**
  - **Type scale** moved to the Tailwind and shadcn defaults, with a 14px `text-sm` body; the design's 13px scale was removed (see `design-system.md`).
  - **Dev port** is now `DEV_PORT=6420` in `.env.local` and `.env.example`, read by `vite.config.js` with `strictPort`. The Supabase URLs above use 6420.
- **Manual steps for the user:** in Supabase Auth → URL Configuration, set Site URL to `http://localhost:6420` and add the redirect URLs `http://localhost:6420/auth/callback` and `http://localhost:6420/reset-password`. Consider custom SMTP later, because default Supabase mail is rate-limited.

**Stop here. Show the result and wait for approval.**

---

## Phase 2: Settings and Fiscal Year ✅ Complete

### Goal
The user can open `/settings` and edit:
- **Profile:** name.
- **Preferences:** fiscal year start month (with a live preview such as "Q1 = Apr–Jun · current: Q2 FY 2026–27"), week start day, time zone and theme.
- **Account:** email (read-only), change password, sign out.

`lib/fiscal.js` provides all quarter maths, fully tested.

### Before Starting: Confirm Phase 1 Is Approved
1. Phase 1 is `✅ Complete`.
2. `useMyProfile` exists.
3. Decide the settings layout together with the design, because `/settings` is full-screen, outside the space shell. It should have a back button to the last space, or to `/spaces`.

### 2.1 Database
No database changes. The columns already exist.

### 2.2 API Layer
Additions to `src/features/auth/api.js`, or a new `src/features/settings/api.js`. Prefer the new file, since settings is its own feature folder:
- `updateMyProfile(patch)` and `useUpdateMyProfile()`, with an optimistic update on `profileKeys.me()`.
- `usePreferences()`: a derived hook returning `{ fyStartMonth, weekStartsOn, timezone, theme }` with defaults applied, for use across the app.

`src/lib/fiscal.js`: the full API in `axon-data-patterns.md` §7. Tests go in `src/tests/lib/fiscal.test.js`:
- Every start month from 1 to 12, for dates on quarter boundaries.
- Labels: `FY 2026–27` for April, `FY 2026` for January.
- `listQuarters` across a year boundary.

### 2.3 Components

```
src/features/settings/
├── api.js
├── schemas.js
├── components/
│   ├── SettingsLayout.jsx        # left section nav (Profile / Preferences / Account) + content, back button
│   ├── ProfileSection.jsx
│   ├── PreferencesSection.jsx    # FY month Select + live quarter preview, week start, timezone combobox, theme toggle-group
│   └── AccountSection.jsx        # change password dialog, sign out
└── pages/SettingsPage.jsx        # /settings/:section? (default profile)
```

- Preferences save on change, optimistically, with a subtle "Saved" confirmation.
- Theme: `ThemeProvider` reads the profile's theme once it loads (profile wins over localStorage), and writes to both.

### 2.4 Routes and Integration
- `/settings/:section?` is wired in `router.jsx` under `RequireAuth`.
- A user menu entry "Settings" is added in Feature 03 (the sidebar). Until then it is reachable by URL.

### 2.5 Impact on Existing Features
| Existing feature | Impact | Action |
|---|---|---|
| 01 ThemeProvider | Syncs with the profile | Add a profile sync effect |

### 2.6 Not in This Phase
- Avatar upload (Storage comes in Feature 15). Show an initials avatar instead.
- Email change flow: backlog

### 2.7 Checklist: Before Marking Complete
- [x] Changing the FY start month persists and the preview updates live. Settings test: switching April to January changes the tiles to Jan–Mar and the label to "Q3 FY 2026", and saves `fy_start_month: 1`.
- [x] Every `fiscal.js` export is covered by tests and the boundary cases pass: 36 tests, covering all 12 start months, leap years, 31 Mar/1 Apr and Dec/Jan.
- [x] Theme choice persists across devices and reloads. `ProfileThemeSync` lets the profile win on load and saves later changes to the profile (test); localStorage (`axon-theme`) covers reloads.
- [x] Change password validates input, then shows a success toast and closes, or shows an error toast and an inline error. The validation is tested; the success path uses the same `useUpdatePassword` as the reset flow.
- [x] `usePreferences()` returns defaults before the profile loads (test)
- [x] `npm run lint`, `npm test` (109 tests) and `npm run build` pass; `axon-rules` is clean
- [x] `00-index.md` status and changelog are updated

### Implementation Notes (Phase 2)
- **Adopted from delta 02 (settings):**
  - There are two sections: **Preferences** and **Profile & account**. `/settings` opens Preferences, and `/settings/profile` redirects to `/settings/account`.
  - A 240px nav with "Back to spaces · Esc". Feature 03 switches this to the last space.
  - Content is 640px wide, with rows grouped in one bordered card.
  - The FY row has a Select plus four quarter tiles; the current quarter is outlined, with a "Today is in …" line.
  - Week start is a Monday/Sunday segmented control. The time zone combobox shows GMT offsets. The theme picker has three preview cards: Light, Dark, and a split System card.
  - Profile has an initials avatar, a name that saves on blur or Enter (Esc reverts), a read-only email, a change-password dialog, and sign-out.
  - The design's "Last changed 4 months ago" line was dropped, because Supabase doesn't expose when the password was last changed.
- **`lib/fiscal.js`** implements the §7 API from the patterns doc, plus:
  - `shiftQuarter`
  - `quarterMonthsLabel`
  - `getFiscalWeek` (design delta D4): W1 is the week containing the quarter's first day, so 23 Sep 2026 is W13.
  - `DEFAULT_FY_START_MONTH`
- **`lib/timezones.js`**: `formatGmtOffset` and `listTimeZones(at, include)`. The `include` argument keeps the saved zone selectable, because the browser's and Node's ICU list only the legacy `Asia/Calcutta`, not `Asia/Kolkata`.
- **`features/settings/api.js`:**
  - `updateMyProfile`, and `useUpdateMyProfile`, which updates optimistically, rolls back with a toast on error, and uses the mutation key `['profile','update']`.
  - `usePreferences`, which fills in defaults. The default time zone is the browser's.
- **Save status:** `useProfileSaveStatus` is derived from `useIsMutating` / `useMutationState`, with no effects. It feeds the new shared `SaveIndicator` (Saving… → Saved, or Not saved). "Saved" stays visible afterwards, as in Notion.
- **New shared components:** both were pulled forward from the G7 list.
  - `components/shared/SegmentedControl.jsx`: a sliding thumb animated through a motion `layoutId` on the snappy spring.
  - `components/shared/SaveIndicator.jsx`.
- **Theme:**
  - `ProfileThemeSync` (in `settings/components`) is mounted inside `AuthProvider` in `App.jsx`, so any theme change is saved to the profile, including one made from `ThemeToggleButton`.
  - In `index.css`, `:root` became `:root, .light`, so a `.light` subtree inside a dark page (the theme previews) resolves light tokens.
- **Tests:**
  - `src/tests/lib/fiscal.test.js` (36) and `timezones.test.js`.
  - `src/tests/features/settings/settings.test.jsx` (9), using a fluent Supabase mock.
  - The test setup adds stubs for Radix pointer events and `scrollIntoView`, and sets `asyncUtilTimeout: 3000`, because lazy chunks were flaky when the whole suite runs in parallel.
- **Not done:** a real-browser check that preferences follow the user to another device. Only the logic is tested.

**Stop here. Show the result and wait for approval.**

---

## Data Model Summary

```
auth.users 1 ── 1 profiles (fy_start_month, week_starts_on, timezone, theme, last_space_id)
```

### `profiles`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK, FK to auth.users, cascade |
| `full_name` | text | ≤ 120 |
| `avatar_url` | text | unused until 15 |
| `fy_start_month` | smallint | 1–12, default 4 |
| `week_starts_on` | smallint | 0–6, default 1 (Monday) |
| `timezone` | text | IANA, from the browser at signup |
| `theme` | text | light, dark or system |
| `last_space_id` | uuid | FK added in 03 |

## Out of Scope (All Phases)
- OAuth, magic links and MFA: backlog
- Account deletion: backlog (Edge Function)
- Multi-user sharing: never (by design)
