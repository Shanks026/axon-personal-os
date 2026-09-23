import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { queryClient } from '@/lib/queryClient'

const AuthContext = createContext(null)

/**
 * Session identity only. The profile is server state, so read it via useMyProfile().
 * `loading` stays true until the first getSession() resolves (which also completes any
 * PKCE code exchange from an email link), so guards render a splash, never a redirect.
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active) setSession(data.session)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      // Token refreshes re-emit the same user; keep the object stable to avoid re-render storms.
      setSession((prev) =>
        prev?.access_token === next?.access_token && prev?.user?.id === next?.user?.id
          ? prev
          : next,
      )
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signOut: async () => {
        const { error } = await supabase.auth.signOut()
        queryClient.clear()
        if (error) throw error
      },
    }),
    [session, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
