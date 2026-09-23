import { SignOutButton } from '@/features/auth/components/SignOutButton'
import { PlaceholderPage } from '@/features/system/components/PlaceholderPage'

export default function SpacesPage() {
  // Temporary sign-out until Feature 03 builds the real gallery header and user menu.
  return <PlaceholderPage title="Spaces" feature="03" actions={<SignOutButton />} />
}
