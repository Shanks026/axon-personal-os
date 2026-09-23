import { Link, Navigate, useSearchParams } from 'react-router'
import { paths } from '@/lib/paths'
import { useAuth } from '@/context/AuthContext'
import { Splash } from '@/components/shared/Splash'
import { Button } from '@/components/ui/button'
import { AuthHeading, AuthLayout } from '@/features/auth/components/AuthLayout'

/**
 * Landing page for email links. supabase-js exchanges the ?code= on load (detectSessionInUrl),
 * so this page only waits for the session and then moves on.
 */
export default function AuthCallbackPage() {
  const { session, loading } = useAuth()
  const [params] = useSearchParams()
  const error = params.get('error_description') ?? params.get('error')

  if (loading) return <Splash label="Signing you in…" />
  if (session && !error) return <Navigate to={paths.spaces()} replace />

  return (
    <AuthLayout>
      <AuthHeading
        title="That link didn’t work"
        description={error ?? 'It may have expired or already been used.'}
      />
      <Button asChild size="lg" className="h-9.5 w-full">
        <Link to={paths.login()}>Back to sign in</Link>
      </Button>
    </AuthLayout>
  )
}
