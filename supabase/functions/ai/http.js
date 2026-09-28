// CORS and JSON helpers for the ai function. The app calls it through supabase.functions.invoke,
// which sends the user's JWT; the platform rejects requests without one (verify_jwt).

const ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? 'http://localhost:6420')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

export function corsHeaders(req) {
  const origin = req.headers.get('origin') ?? ''
  return {
    'Access-Control-Allow-Origin': ORIGINS.includes(origin) ? origin : ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

export function json(req, status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  })
}

/** An error the client can show: `{ error: { code, message } }` with an HTTP status. */
export class HttpError extends Error {
  constructor(status, code, message) {
    super(message)
    this.status = status
    this.code = code
  }
}
