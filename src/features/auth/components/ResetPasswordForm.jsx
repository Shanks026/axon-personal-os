import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { paths } from '@/lib/paths'
import { Button } from '@/components/ui/button'
import { FieldGroup } from '@/components/ui/field'
import { useUpdatePassword } from '@/features/auth/api'
import { AuthHeading } from '@/features/auth/components/AuthLayout'
import { AuthTextField } from '@/features/auth/components/AuthTextField'
import { FormAlert } from '@/features/auth/components/FormAlert'
import { newPasswordSchema } from '@/features/auth/schemas'
import { mapAuthError } from '@/features/auth/utils'

/** Needs the recovery session created from the emailed link. */
export function ResetPasswordForm({ email }) {
  const navigate = useNavigate()
  const update = useUpdatePassword()
  const form = useForm({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { password: '', confirm: '' },
  })

  const onSubmit = form.handleSubmit(({ password }) =>
    update.mutate(password, {
      onSuccess: () => {
        toast.success('Password updated')
        navigate(paths.spaces(), { replace: true })
      },
      onError: (err) => {
        const message = mapAuthError(err)
        if (['same_password', 'weak_password'].includes(err.code)) {
          form.setError('password', { message })
        } else {
          form.setError('root', { message })
        }
      },
    }),
  )

  return (
    <>
      <AuthHeading title="Choose a new password" description={email && `For ${email}`} />
      <form onSubmit={onSubmit} noValidate>
        <FieldGroup className="gap-3.5">
          <AuthTextField
            control={form.control}
            name="password"
            label="New password"
            type="password"
            autoComplete="new-password"
            autoFocus
          />
          <AuthTextField
            control={form.control}
            name="confirm"
            label="Confirm password"
            type="password"
            autoComplete="new-password"
          />
          <FormAlert>{form.formState.errors.root?.message}</FormAlert>
          <Button type="submit" size="lg" className="mt-1.5 h-9.5" disabled={update.isPending}>
            {update.isPending ? 'Updating…' : 'Update password'}
          </Button>
        </FieldGroup>
      </form>
    </>
  )
}
