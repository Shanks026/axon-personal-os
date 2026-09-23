import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, renderHook, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { useTheme } from '@/components/theme/useTheme'
import { TooltipProvider } from '@/components/ui/tooltip'
import { usePreferences } from '@/features/settings/api'
import { ProfileThemeSync } from '@/features/settings/components/ProfileThemeSync'
import SettingsPage from '@/features/settings/pages/SettingsPage'
import { initials } from '@/features/settings/utils'

const db = vi.hoisted(() => ({ profile: null, updates: [], pending: false }))

vi.mock('@/context/AuthContext', () => ({
  AuthProvider: ({ children }) => children,
  useAuth: () => ({
    session: { access_token: 't' },
    user: { id: 'u1', email: 'aditya@example.com' },
    loading: false,
    signOut: vi.fn(async () => {}),
  }),
}))

// Minimal fluent mock of supabase.from('profiles')…
vi.mock('@/lib/supabase', () => {
  const single = (resolve) => ({ single: resolve })
  return {
    supabase: {
      from: () => ({
        select: () => ({
          eq: () =>
            single(() =>
              db.pending
                ? new Promise(() => {})
                : Promise.resolve({ data: db.profile, error: null }),
            ),
        }),
        update: (patch) => ({
          eq: () => ({
            select: () =>
              single(() => {
                db.updates.push(patch)
                db.profile = { ...db.profile, ...patch }
                return Promise.resolve({ data: db.profile, error: null })
              }),
          }),
        }),
      }),
      auth: { updateUser: vi.fn(async () => ({ data: {}, error: null })) },
    },
  }
})

/** Changes the theme the way the settings picker does. */
function ThemeSetter() {
  const { setTheme } = useTheme()
  return (
    <button type="button" onClick={() => setTheme('light')}>
      light
    </button>
  )
}

const baseProfile = {
  id: 'u1',
  full_name: 'Aditya Rao',
  fy_start_month: 4,
  week_starts_on: 1,
  timezone: 'Asia/Kolkata',
  theme: 'system',
}

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <ThemeProvider>
      <QueryClientProvider client={qc}>
        <TooltipProvider>{children}</TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}

function renderSettings(path = '/settings') {
  const router = createMemoryRouter(
    [
      { path: '/settings/:section?', Component: SettingsPage },
      { path: '/spaces', element: <p>spaces</p> },
    ],
    { initialEntries: [path] },
  )
  render(<RouterProvider router={router} />, { wrapper })
  return router
}

beforeEach(() => {
  db.profile = { ...baseProfile }
  db.updates = []
  db.pending = false
  localStorage.clear()
  document.documentElement.className = ''
})

afterEach(() => vi.useRealTimers())

describe('initials', () => {
  it('builds initials from a name or email', () => {
    expect(initials('Aditya Rao')).toBe('AR')
    expect(initials('  aditya  kumar rao ')).toBe('AR')
    expect(initials('Cher')).toBe('CH')
    expect(initials('', 'me@example.com')).toBe('M')
    expect(initials(null, null)).toBe('?')
  })
})

describe('usePreferences', () => {
  it('returns defaults before the profile loads', () => {
    db.pending = true
    const { result } = renderHook(() => usePreferences(), { wrapper })
    expect(result.current).toMatchObject({
      fyStartMonth: 4,
      weekStartsOn: 1,
      theme: 'system',
      isLoaded: false,
    })
    expect(result.current.timezone).toBeTruthy()
  })

  it('reads saved values once loaded', async () => {
    db.profile = { ...baseProfile, fy_start_month: 1, week_starts_on: 0 }
    const { result } = renderHook(() => usePreferences(), { wrapper })
    await waitFor(() => expect(result.current.isLoaded).toBe(true))
    expect(result.current).toMatchObject({ fyStartMonth: 1, weekStartsOn: 0 })
  })
})

describe('SettingsPage', () => {
  it('opens Preferences by default and treats /settings/profile as the account section', async () => {
    const router = renderSettings('/settings')
    expect(await screen.findByRole('heading', { name: 'Preferences' })).toBeInTheDocument()

    await router.navigate('/settings/profile')
    expect(await screen.findByRole('heading', { name: 'Profile & account' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/settings/account')
  })

  it('updates the quarter preview live and saves the fiscal year start month', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 8, 23, 12))
    const user = userEvent.setup()
    renderSettings('/settings/preferences')

    expect(await screen.findByText('Q2 FY 2026–27')).toBeInTheDocument()
    expect(screen.getByText('Apr–Jun')).toBeInTheDocument()

    await user.click(screen.getByRole('combobox', { name: /fiscal year starts in/i }))
    await user.click(await screen.findByRole('option', { name: 'January' }))

    expect(await screen.findByText('Q3 FY 2026')).toBeInTheDocument()
    expect(screen.getByText('Jan–Mar')).toBeInTheDocument()
    await waitFor(() => expect(db.updates).toContainEqual({ fy_start_month: 1 }))
    expect(await screen.findByText('Saved')).toBeInTheDocument()
  })

  it('saves the week start from the segmented control', async () => {
    const user = userEvent.setup()
    renderSettings('/settings/preferences')
    await user.click(await screen.findByRole('radio', { name: 'Sunday' }))
    await waitFor(() => expect(db.updates).toContainEqual({ week_starts_on: 0 }))
    expect(screen.getByRole('radio', { name: 'Sunday' })).toHaveAttribute('aria-checked', 'true')
  })

  it('saves the name on blur and shows initials', async () => {
    const user = userEvent.setup()
    renderSettings('/settings/account')
    await waitFor(() => expect(screen.getByLabelText('Name')).toHaveValue('Aditya Rao'))
    const input = screen.getByLabelText('Name')
    expect(screen.getByText('AR')).toBeInTheDocument()
    await user.clear(input)
    await user.type(input, 'Aditya K Rao')
    await user.tab()
    await waitFor(() => expect(db.updates).toContainEqual({ full_name: 'Aditya K Rao' }))
    expect(screen.getByText('aditya@example.com')).toBeInTheDocument()
  })

  it('validates the change-password dialog', async () => {
    const user = userEvent.setup()
    renderSettings('/settings/account')
    await user.click(await screen.findByRole('button', { name: 'Change password' }))
    await user.type(screen.getByLabelText('New password'), 'longenough1')
    await user.type(screen.getByLabelText('Confirm password'), 'different11')
    await user.click(screen.getByRole('button', { name: 'Update password' }))
    expect(await screen.findByText('Passwords don’t match.')).toBeInTheDocument()
  })
})

describe('ProfileThemeSync', () => {
  it('applies the profile theme on load, then saves later changes to the profile', async () => {
    db.profile = { ...baseProfile, theme: 'dark' }
    const user = userEvent.setup()
    render(
      <>
        <ProfileThemeSync />
        <ThemeSetter />
      </>,
      { wrapper },
    )
    await waitFor(() => expect(document.documentElement).toHaveClass('dark'))
    expect(db.updates).toEqual([])

    await user.click(screen.getByRole('button', { name: 'light' }))
    await waitFor(() => expect(db.updates).toContainEqual({ theme: 'light' }))
  })
})
