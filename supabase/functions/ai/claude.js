import Anthropic from 'npm:@anthropic-ai/sdk@0.128.0'
import { HttpError } from './http.js'

/** The models Axon may call, with prices in USD per million tokens (input, output, cache read). */
export const MODELS = {
  'claude-sonnet-5': { label: 'Sonnet 5', input: 2, output: 10, cacheRead: 0.2, effort: true },
  'claude-opus-5-5': { label: 'Opus 5.5', input: 4, output: 20, cacheRead: 0.2, effort: true },
  // Haiku 4.5 has no effort setting (the API rejects it there).
  'claude-haiku-4-5': { label: 'Haiku 4.5', input: 1, output: 5, cacheRead: 0.1, effort: false },
}

export const DEFAULT_MODELS = {
  draft_tasks: 'claude-sonnet-5',
  checklist: 'claude-sonnet-5',
  report_weekly: 'claude-sonnet-5',
  report_quarterly: 'claude-opus-5-5',
  chat: 'claude-sonnet-5',
}

const PLACEHOLDER = /^sk-ant-REPLACE/i

/** False while the key is missing or still the placeholder (`sk-ant-REPLACE_ME`). */
export function aiConfigured() {
  const key = Deno.env.get('ANTHROPIC_API_KEY') ?? ''
  return key.length > 20 && !PLACEHOLDER.test(key)
}

let client = null
function getClient() {
  if (!aiConfigured()) {
    throw new HttpError(409, 'ai_not_configured', "AI isn't set up yet: add ANTHROPIC_API_KEY.")
  }
  client ??= new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY'), maxRetries: 2 })
  return client
}

/** The request's model if allowed, else the saved default for the job, else the built-in one. */
export function resolveModel(job, requested, aiSettings) {
  if (requested) {
    if (!MODELS[requested]) throw new HttpError(400, 'bad_model', `Model not allowed: ${requested}`)
    return requested
  }
  const saved = aiSettings?.models?.[job]
  return MODELS[saved] ? saved : DEFAULT_MODELS[job]
}

export function costOf(model, usage) {
  const p = MODELS[model]
  const input = usage?.input_tokens ?? 0
  const output = usage?.output_tokens ?? 0
  const cacheRead = usage?.cache_read_input_tokens ?? 0
  const cacheWrite = usage?.cache_creation_input_tokens ?? 0
  const usd =
    (input * p.input + cacheWrite * p.input * 1.25 + cacheRead * p.cacheRead + output * p.output) /
    1_000_000
  return Math.round(usd * 1_000_000) / 1_000_000
}

/**
 * One structured-output call: returns `{ data, usage }`, where `data` is the parsed JSON that
 * matches `schema`. Refusals, truncation and API errors become HttpErrors with readable messages.
 */
export async function structuredCall({
  model,
  system,
  user,
  schema,
  effort = 'low',
  maxTokens = 16000,
}) {
  const output_config = { format: { type: 'json_schema', schema } }
  if (MODELS[model].effort) output_config.effort = effort

  let response
  try {
    response = await getClient().messages.create({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
      output_config,
    })
  } catch (err) {
    throw toHttpError(err)
  }

  if (response.stop_reason === 'refusal') {
    throw new HttpError(422, 'refused', 'The model declined this request. Try rephrasing it.')
  }
  if (response.stop_reason === 'max_tokens') {
    throw new HttpError(422, 'too_long', 'The answer was cut off. Try a shorter description.')
  }
  const text = response.content.find((b) => b.type === 'text')?.text
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new HttpError(502, 'bad_output', 'The model returned something unreadable. Try again.')
  }
  return { data, usage: response.usage }
}

function toHttpError(err) {
  if (err instanceof Anthropic.AuthenticationError) {
    return new HttpError(
      502,
      'bad_key',
      'The Anthropic API key was rejected. Check ANTHROPIC_API_KEY.',
    )
  }
  if (err instanceof Anthropic.PermissionDeniedError) {
    return new HttpError(502, 'no_access', 'This API key has no access to that model.')
  }
  if (err instanceof Anthropic.RateLimitError) {
    return new HttpError(
      429,
      'rate_limited',
      'Too many AI requests right now. Try again in a minute.',
    )
  }
  if (err instanceof Anthropic.BadRequestError) {
    // Includes "credit balance is too low".
    return new HttpError(400, 'bad_request', err.message)
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return new HttpError(502, 'unreachable', "Couldn't reach Anthropic. Try again.")
  }
  if (err instanceof Anthropic.APIError) {
    return new HttpError(502, 'api_error', `Anthropic error ${err.status ?? ''}: ${err.message}`)
  }
  return err
}
