import { useMutation, useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { paths } from '@/lib/paths'
import { useAuth } from '@/context/AuthContext'

export const profileKeys = {
  all: ['profile'],
  me: (userId) => [...profileKeys.all, 'me', userId],
}

const redirectTo = (path) => `${window.location.origin}${path}`

/** Email confirmation is disabled in Supabase, so this normally returns a session straight away. */
export async function signUp({ fullName, email, password }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      emailRedirectTo: redirectTo(paths.authCallback()),
    },
  })
  if (error) throw error
  return data
}

export async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function sendPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectTo(paths.resetPassword()),
  })
  if (error) throw error
}

export async function updatePassword(password) {
  const { data, error } = await supabase.auth.updateUser({ password })
  if (error) throw error
  return data
}

export async function fetchMyProfile(userId) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
  if (error) throw error
  return data
}

export function useMyProfile() {
  const { user } = useAuth()
  return useQuery({
    queryKey: profileKeys.me(user?.id),
    queryFn: () => fetchMyProfile(user.id),
    enabled: !!user?.id,
  })
}

// Mutation hooks. Auth errors render inline in the form (via mapAuthError), not as toasts.
export const useSignUp = () => useMutation({ mutationFn: signUp })
export const useSignIn = () => useMutation({ mutationFn: signIn })
export const useSendPasswordReset = () => useMutation({ mutationFn: sendPasswordReset })
export const useUpdatePassword = () => useMutation({ mutationFn: updatePassword })
