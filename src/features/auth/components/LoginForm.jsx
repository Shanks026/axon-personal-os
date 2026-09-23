import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { paths } from '@/lib/paths'
import { Button } from '@/components/ui/button'
import { FieldGroup } from '@/components/ui/field'
import { useSignIn } from '@/features/auth/api'
import { AuthTextField } from '@/features/auth/components/AuthTextField'
import { FormAlert } from '@/features/auth/components/FormAlert'
import { loginSchema } from '@/features/auth/schemas'
import { mapAuthError } from '@/features/auth/utils'

/** On success the session changes and PublicOnly redirects (to `from`, or /spaces). */
export function LoginForm() {
  const signIn = useSignIn()
  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = form.handleSubmit((values) =>
    signIn.mutate(values, {
      onError: (err) => {
        const message = mapAuthError(err)
        if (err.code === 'invalid_credentials' || /invalid login/i.test(err.message)) {
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
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          autoFocus
        />
        <AuthTextField
          control={form.control}
          name="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          aside={
            <Link
              to={paths.forgotPassword()}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Forgot?
            </Link>
          }
        />
        <FormAlert>{form.formState.errors.root?.message}</FormAlert>
        <Button type="submit" size="lg" className="mt-1.5 h-9.5" disabled={signIn.isPending}>
          {signIn.isPending ? 'Signing in…' : 'Sign in'}
        </Button>
      </FieldGroup>
    </form>
  )
}
