import { Link } from 'react-router'
import { paths } from '@/lib/paths'
import { useAuth } from '@/context/AuthContext'
import { Splash } from '@/components/shared/Splash'
import { Button } from '@/components/ui/button'
import { AuthHeading, AuthLayout } from '@/features/auth/components/AuthLayout'
import { ResetPasswordForm } from '@/features/auth/components/ResetPasswordForm'

/** The emailed link signs the user in with a recovery session (PKCE code exchanged on load). */
export default function ResetPasswordPage() {
  const { session, user, loading } = useAuth()
  if (loading) return <Splash label="Checking your link…" />

  return (
    <AuthLayout>
      {session ? (
        <ResetPasswordForm email={user?.email} />
      ) : (
        <>
          <AuthHeading
            title="This link has expired"
            description="Reset links work once and expire after a while. Request a new one."
          />
          <Button asChild size="lg" className="h-9.5 w-full">
            <Link to={paths.forgotPassword()}>Send a new link</Link>
          </Button>
        </>
      )}
    </AuthLayout>
  )
}
