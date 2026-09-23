import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LoginForm } from '@/features/auth/components/LoginForm'
import { SignupForm } from '@/features/auth/components/SignupForm'
import { loginSchema, newPasswordSchema, signupSchema } from '@/features/auth/schemas'
import { mapAuthError } from '@/features/auth/utils'

const sb = vi.hoisted(() => ({
  auth: { signInWithPassword: vi.fn(), signUp: vi.fn() },
}))
vi.mock('@/lib/supabase', () => ({ supabase: sb }))

function renderWithProviders(ui) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('auth schemas', () => {
  it('normalises email and requires a password on login', () => {
    expect(loginSchema.parse({ email: '  Me@Example.COM ', password: 'x' }).email).toBe(
      'me@example.com',
    )
    expect(loginSchema.safeParse({ email: 'nope', password: '' }).success).toBe(false)
  })

  it('requires 10+ character passwords and a matching confirmation on signup', () => {
    const base = { fullName: 'Aditya', email: 'a@b.co' }
    expect(signupSchema.safeParse({ ...base, password: 'short', confirm: 'short' }).success).toBe(
      false,
    )
    expect(
      signupSchema.safeParse({ ...base, password: 'longenough1', confirm: 'longenough1' }).success,
    ).toBe(true)
    const mismatch = signupSchema.safeParse({ ...base, password: 'longenough1', confirm: 'other' })
    expect(mismatch.success).toBe(false)
    expect(mismatch.error.issues[0].path).toEqual(['confirm'])
  })

  it('requires matching passwords on reset', () => {
    const r = newPasswordSchema.safeParse({ password: 'longenough1', confirm: 'different11' })
    expect(r.success).toBe(false)
    expect(r.error.issues[0].path).toEqual(['confirm'])
  })
})

describe('mapAuthError', () => {
  it('maps known codes and messages to friendly copy', () => {
    expect(mapAuthError({ code: 'invalid_credentials' })).toBe(
      'That password doesn’t match this email.',
    )
    expect(mapAuthError({ message: 'Invalid login credentials' })).toBe(
      'That password doesn’t match this email.',
    )
    expect(mapAuthError({ code: 'user_already_exists' })).toMatch(/already exists/)
    expect(mapAuthError({ message: 'Failed to fetch' })).toMatch(/connection/)
    expect(mapAuthError({ message: 'Custom thing' })).toBe('Custom thing')
  })
})

describe('LoginForm', () => {
  beforeEach(() => vi.clearAllMocks())

  it('validates before calling Supabase', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginForm />)
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument()
    expect(sb.auth.signInWithPassword).not.toHaveBeenCalled()
  })

  it('shows wrong-password errors under the password field', async () => {
    sb.auth.signInWithPassword.mockResolvedValue({
      data: {},
      error: { code: 'invalid_credentials', message: 'Invalid login credentials' },
    })
    const user = userEvent.setup()
    renderWithProviders(<LoginForm />)
    await user.type(screen.getByLabelText('Email'), 'me@example.com')
    await user.type(screen.getByLabelText('Password'), 'wrongpassword')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('That password doesn’t match this email.')).toBeInTheDocument()
    expect(sb.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'me@example.com',
      password: 'wrongpassword',
    })
  })
})

describe('SignupForm', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sends name and browser timezone as metadata', async () => {
    sb.auth.signUp.mockResolvedValue({ data: { session: { access_token: 't' } }, error: null })
    const onNeedsConfirmation = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(<SignupForm onNeedsConfirmation={onNeedsConfirmation} />)
    await user.type(screen.getByLabelText('Name'), 'Aditya Rao')
    await user.type(screen.getByLabelText('Email'), 'a@b.co')
    await user.type(screen.getByLabelText('Password'), 'longenough1')
    await user.type(screen.getByLabelText('Confirm password'), 'longenough1')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    await vi.waitFor(() => expect(sb.auth.signUp).toHaveBeenCalled())
    const arg = sb.auth.signUp.mock.calls[0][0]
    expect(arg.email).toBe('a@b.co')
    expect(arg.options.data.full_name).toBe('Aditya Rao')
    expect(arg.options.data.timezone).toBeTruthy()
    expect(arg).not.toHaveProperty('confirm')
    expect(onNeedsConfirmation).not.toHaveBeenCalled()
  })

  it('blocks signup when the passwords differ', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SignupForm />)
    await user.type(screen.getByLabelText('Name'), 'A')
    await user.type(screen.getByLabelText('Email'), 'a@b.co')
    await user.type(screen.getByLabelText('Password'), 'longenough1')
    await user.type(screen.getByLabelText('Confirm password'), 'longenough2')
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByText('Passwords don’t match.')).toBeInTheDocument()
    expect(sb.auth.signUp).not.toHaveBeenCalled()
  })

  it('masks password fields until the eye toggle is pressed', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SignupForm />)
    const input = screen.getByLabelText('Password')
    expect(input).toHaveAttribute('type', 'password')
    expect(screen.getByLabelText('Confirm password')).toHaveAttribute('type', 'password')
    await user.click(screen.getAllByRole('button', { name: 'Show password' })[0])
    expect(input).toHaveAttribute('type', 'text')
    await user.click(screen.getByRole('button', { name: 'Hide password' }))
    expect(input).toHaveAttribute('type', 'password')
  })

  it('falls back to the check-email state when no session comes back', async () => {
    sb.auth.signUp.mockResolvedValue({ data: { session: null, user: {} }, error: null })
    const onNeedsConfirmation = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(<SignupForm onNeedsConfirmation={onNeedsConfirmation} />)
    await user.type(screen.getByLabelText('Name'), 'A')
    await user.type(screen.getByLabelText('Email'), 'a@b.co')
    await user.type(screen.getByLabelText('Password'), 'longenough1')
    await user.type(screen.getByLabelText('Confirm password'), 'longenough1')
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    await vi.waitFor(() => expect(onNeedsConfirmation).toHaveBeenCalledWith('a@b.co'))
  })
})
