import { Link } from 'react-router'
import { paths } from '@/lib/paths'
import { AuthHeading, AuthLayout } from '@/features/auth/components/AuthLayout'
import { LoginForm } from '@/features/auth/components/LoginForm'

export default function LoginPage() {
  return (
    <AuthLayout>
      <AuthHeading title="Welcome back" description="Sign in to your second brain." />
      <LoginForm />
      <p className="mt-5 text-center text-muted-foreground">
        New to Axon?{' '}
        <Link to={paths.signup()} className="font-medium text-foreground hover:underline">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  )
}
