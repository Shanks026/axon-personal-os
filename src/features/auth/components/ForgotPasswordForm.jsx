import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { paths } from '@/lib/paths'
import { Button } from '@/components/ui/button'
import { FieldGroup } from '@/components/ui/field'
import { useSendPasswordReset } from '@/features/auth/api'
import { AuthHeading } from '@/features/auth/components/AuthLayout'
import { AuthTextField } from '@/features/auth/components/AuthTextField'
import { CheckInbox } from '@/features/auth/components/CheckInbox'
import { FormAlert } from '@/features/auth/components/FormAlert'
import { emailSchema } from '@/features/auth/schemas'
import { mapAuthError } from '@/features/auth/utils'

/** Always shows the same confirmation, whether or not the account exists (no enumeration). */
export function ForgotPasswordForm() {
  const [sentTo, setSentTo] = useState(null)
  const send = useSendPasswordReset()
  const form = useForm({ resolver: zodResolver(emailSchema), defaultValues: { email: '' } })

  const onSubmit = form.handleSubmit(({ email }) =>
    send.mutate(email, {
      onSuccess: () => setSentTo(email),
      onError: (err) => form.setError('root', { message: mapAuthError(err) }),
    }),
  )

  if (sentTo) {
    return (
      <CheckInbox
        email={sentTo}
        message="If an account exists, we sent a reset link to"
        onResend={() => send.mutate(sentTo)}
        resendPending={send.isPending}
        footer={<BackToSignIn />}
      />
    )
  }

  return (
    <>
      <AuthHeading
        title="Reset your password"
        description="We’ll email you a link to choose a new one."
      />
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
          <FormAlert>{form.formState.errors.root?.message}</FormAlert>
          <Button type="submit" size="lg" className="mt-1.5 h-9.5" disabled={send.isPending}>
            {send.isPending ? 'Sending…' : 'Send reset link'}
          </Button>
        </FieldGroup>
      </form>
      <p className="mt-5 text-center text-muted-foreground">
        Remembered it? <BackToSignIn />
      </p>
    </>
  )
}

function BackToSignIn() {
  return (
    <Link to={paths.login()} className="font-medium text-foreground hover:underline">
      Back to sign in
    </Link>
  )
}
