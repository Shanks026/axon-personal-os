// Axon's AI endpoint (Feature 17). POST { action, ... } with the user's JWT.
//   status       → { configured, providers: { gemini, anthropic }, models: [{ id, label, provider, available }] }
//   draft_tasks  → { tasks, model, usage, costUsd }
//   suggest_tags → { tags, model, usage, costUsd }   ({ title, description, context: { tags, examples } })
// Owner-only (AXON_OWNER_ID). Every model call is logged to public.ai_usage with the caller's JWT.
import { HttpError, corsHeaders, json } from './http.js'
import { requireOwner } from './auth.js'
import { MODELS, costOf, providerStatus, resolveModel } from './models.js'
import { draftTasks } from './draftTasks.js'
import { suggestTags } from './suggestTags.js'

async function loadAiSettings(supabase, userId) {
  const { data } = await supabase.from('profiles').select('ai_settings').eq('id', userId).single()
  return data?.ai_settings ?? {}
}

async function logUsage(supabase, { job, model, usage, costUsd }) {
  const { error } = await supabase.from('ai_usage').insert({
    job,
    model,
    input_tokens: usage?.input_tokens ?? 0,
    output_tokens: usage?.output_tokens ?? 0,
    cache_read_tokens: usage?.cache_read_input_tokens ?? 0,
    cost_usd: costUsd,
  })
  if (error) console.error('ai_usage insert failed', error.message)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })
  if (req.method !== 'POST')
    return json(req, 405, { error: { code: 'method', message: 'POST only' } })

  try {
    const { supabase, user } = await requireOwner(req)
    const body = await req.json().catch(() => ({}))

    switch (body.action) {
      case 'status': {
        const providers = providerStatus()
        return json(req, 200, {
          configured: Object.values(providers).some(Boolean),
          providers,
          models: Object.entries(MODELS).map(([id, m]) => ({
            id,
            label: m.label,
            provider: m.provider,
            available: providers[m.provider],
          })),
        })
      }

      case 'draft_tasks': {
        const settings = await loadAiSettings(supabase, user.id)
        const model = resolveModel('draft_tasks', body.model, settings)
        const { tasks, usage } = await draftTasks({ text: body.text, model, context: body.context })
        const costUsd = costOf(model, usage)
        await logUsage(supabase, { job: 'draft_tasks', model, usage, costUsd })
        return json(req, 200, { tasks, model, usage, costUsd })
      }

      case 'suggest_tags': {
        const settings = await loadAiSettings(supabase, user.id)
        const model = resolveModel('suggest_tags', body.model, settings)
        const { tags, usage } = await suggestTags({
          title: body.title,
          description: body.description,
          model,
          context: body.context,
        })
        const costUsd = usage ? costOf(model, usage) : 0
        if (usage) await logUsage(supabase, { job: 'suggest_tags', model, usage, costUsd })
        return json(req, 200, { tags, model, usage, costUsd })
      }

      default:
        throw new HttpError(400, 'bad_action', `Unknown action: ${body.action ?? '(none)'}`)
    }
  } catch (err) {
    if (err instanceof HttpError) {
      return json(req, err.status, { error: { code: err.code, message: err.message } })
    }
    console.error(err)
    return json(req, 500, {
      error: { code: 'internal', message: 'Something went wrong in the AI function.' },
    })
  }
})
