import { LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'

/** Signing out clears the query cache; RequireAuth then redirects to /login. */
export function SignOutButton({ variant = 'outline', className }) {
  const { signOut } = useAuth()
  return (
    <Button
      variant={variant}
      className={className}
      onClick={() => signOut().catch((err) => toast.error(err.message ?? 'Could not sign out'))}
    >
      <LogOut />
      Sign out
    </Button>
  )
}
