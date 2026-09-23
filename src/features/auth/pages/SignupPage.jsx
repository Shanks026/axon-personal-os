import { useState } from 'react'
import { Link } from 'react-router'
import { paths } from '@/lib/paths'
import { AuthHeading, AuthLayout } from '@/features/auth/components/AuthLayout'
import { CheckInbox } from '@/features/auth/components/CheckInbox'
import { SignupForm } from '@/features/auth/components/SignupForm'

export default function SignupPage() {
  // Only set if Supabase email confirmation gets re-enabled (signUp then returns no session).
  const [pendingEmail, setPendingEmail] = useState(null)

  return (
    <AuthLayout>
      {pendingEmail ? (
        <CheckInbox email={pendingEmail} message="We sent a confirmation link to" />
      ) : (
        <>
          <AuthHeading
            title="Create your account"
            description="One person, all your work. Takes a minute."
          />
          <SignupForm onNeedsConfirmation={setPendingEmail} />
          <p className="mt-5 text-center text-muted-foreground">
            Already have one?{' '}
            <Link to={paths.login()} className="font-medium text-foreground hover:underline">
              Sign in
            </Link>
          </p>
        </>
      )}
    </AuthLayout>
  )
}
