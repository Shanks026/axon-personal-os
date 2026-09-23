import { Navigate, useParams } from 'react-router'
import { paths } from '@/lib/paths'
import { AccountSection } from '@/features/settings/components/AccountSection'
import { PreferencesSection } from '@/features/settings/components/PreferencesSection'
import { SettingsLayout } from '@/features/settings/components/SettingsLayout'

const SECTIONS = {
  preferences: {
    title: 'Preferences',
    description: 'Dates, quarters and how Axon looks.',
    Component: PreferencesSection,
  },
  account: {
    title: 'Profile & account',
    description: 'Who you are and how you sign in.',
    Component: AccountSection,
  },
}

// `/settings/profile` is an alias: the design merges profile into the account section.
const ALIASES = { profile: 'account' }

export default function SettingsPage() {
  const { section = 'preferences' } = useParams()
  const id = ALIASES[section] ?? section
  const current = SECTIONS[id]

  if (!current || id !== section) {
    return <Navigate to={paths.settings(current ? id : 'preferences')} replace />
  }

  const { title, description, Component } = current
  return (
    <SettingsLayout section={id} title={title} description={description}>
      <Component />
    </SettingsLayout>
  )
}
