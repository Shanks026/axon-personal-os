# Feature 02: Auth, Profile and Preferences

**Product**: Axon, a personal second-brain OS
**File**: `.claude/features/02-auth-and-settings.md`
**Status**: 🔵 Planned
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

## Phase 1: Authentication

### Goal
A visitor can sign up and is signed in straight away (email confirmation is disabled in Supabase), log in, reset a forgotten password and log out. Protected routes redirect to `/login`, and auth pages redirect signed-in users away. A `profiles` row is created automatically for every new user. After an explicit login the user lands on `/spaces`, which is still a placeholder until Feature 03.

### Before Starting: Confirm With Codebase
1. Feature 01 is complete. `src/lib/supabase.js`, `routes/router.jsx`, `routes/guards.jsx` (stubs), `Splash` and `paths` all exist.
2. Check the current supabase-js v2 APIs: `signUp({ email, password, options: { data, emailRedirectTo } })`, `signInWithPassword`, `resetPasswordForEmail(email, { redirectTo })`, `updateUser({ password })`, `exchangeCodeForSession`, and whether the default flow is PKCE for the browser client.
3. Use the Supabase MCP to confirm the project has no existing `public.profiles` table or `on_auth_user_created` trigger (`list_tables`).
4. **Manual step for the user.** In the Supabase dashboard, under Auth → URL Configuration:
   - Site URL: `http://localhost:5173`.
   - Redirect URLs: add `http://localhost:5173/auth/callback` and `http://localhost:5173/reset-password`.
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
- [ ] The migration is applied, mirrored, and advisors are clean
- [ ] Signup creates `auth.users` and `profiles` rows (with `timezone` from the browser) and lands the user on `/spaces`, signed in
- [ ] `/auth/callback` still works for password-recovery links (and would handle confirmation links if confirmation is re-enabled)
- [ ] Login with bad credentials shows a friendly inline error, and good credentials navigate to `/spaces`, or to `state.from` when present
- [ ] Forgot password sends mail and the reset page updates the password; an expired link shows the resend state
- [ ] Refreshing on a protected route while signed in never flashes `/login` (splash only)
- [ ] Signing out clears the React Query cache and redirects to `/login`
- [ ] `useAuth` and `useMyProfile` work; no Supabase import outside `api.js`, `lib` or `AuthContext`
- [ ] `npm run lint`, `npm test` and `npm run build` pass; `axon-rules` is clean
- [ ] `00-index.md` DB registry, status and changelog (including the manual dashboard steps) are updated

**Stop here. Show the result and wait for approval.**

---

## Phase 2: Settings and Fiscal Year

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
- [ ] Changing the FY start month persists and the preview updates live
- [ ] Every `fiscal.js` export is covered by tests; boundary cases pass
- [ ] Theme choice persists across devices (profile) and reloads
- [ ] Change password works and shows success or error toasts
- [ ] `usePreferences()` returns defaults before the profile loads
- [ ] `npm run lint`, `npm test` and `npm run build` pass; `axon-rules` is clean
- [ ] `00-index.md` status and changelog are updated

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
