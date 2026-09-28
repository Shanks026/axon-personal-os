import { createClient } from 'npm:@supabase/supabase-js@2.117.2'
import { HttpError } from './http.js'

/**
 * The caller's Supabase client (their JWT, so RLS applies) and user, but only for the owner.
 * Signup is open and Edge Function secrets are project-wide, so anyone else is refused; a missing
 * AXON_OWNER_ID refuses everyone (fail closed).
 */
export async function requireOwner(req) {
  const ownerId = Deno.env.get('AXON_OWNER_ID')
  if (!ownerId)
    throw new HttpError(503, 'owner_not_set', 'AXON_OWNER_ID is not set for this project.')

  const authorization = req.headers.get('Authorization') ?? ''
  const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  })
  const { data, error } = await supabase.auth.getUser(authorization.replace(/^Bearer\s+/i, ''))
  if (error || !data?.user) throw new HttpError(401, 'unauthorized', 'Sign in again to use AI.')
  if (data.user.id !== ownerId)
    throw new HttpError(403, 'forbidden', 'AI is only available to the owner of this Axon.')
  return { supabase, user: data.user }
}
