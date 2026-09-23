import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { FieldGroup } from '@/components/ui/field'
import { useSignUp } from '@/features/auth/api'
import { AuthTextField } from '@/features/auth/components/AuthTextField'
import { FormAlert } from '@/features/auth/components/FormAlert'
import { PASSWORD_MIN, signupSchema } from '@/features/auth/schemas'
import { mapAuthError } from '@/features/auth/utils'

/**
 * Email confirmation is off, so signUp returns a session and PublicOnly redirects to /spaces.
 * If confirmation is ever re-enabled, no session comes back and `onNeedsConfirmation` fires.
 */
export function SignupForm({ onNeedsConfirmation }) {
  const signUp = useSignUp()
  const form = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: { fullName: '', email: '', password: '' },
  })

  const onSubmit = form.handleSubmit((values) =>
    signUp.mutate(values, {
      onSuccess: (data) => {
        if (!data.session) onNeedsConfirmation?.(values.email)
      },
      onError: (err) => {
        const message = mapAuthError(err)
        if (['user_already_exists', 'email_exists'].includes(err.code)) {
          form.setError('email', { message })
        } else if (err.code === 'weak_password') {
          form.setError('password', { message })
        } else {
          form.setError('root', { message })
        }
      },
    }),
  )

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup className="gap-3.5">
        <AuthTextField
          control={form.control}
          name="fullName"
          label="Name"
          autoComplete="name"
          autoFocus
        />
        <AuthTextField
          control={form.control}
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
        />
        <AuthTextField
          control={form.control}
          name="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          placeholder={`At least ${PASSWORD_MIN} characters`}
        />
        <FormAlert>{form.formState.errors.root?.message}</FormAlert>
        <Button type="submit" size="lg" className="mt-1.5 h-9.5" disabled={signUp.isPending}>
          {signUp.isPending ? 'Creating account…' : 'Create account'}
        </Button>
      </FieldGroup>
    </form>
  )
}
