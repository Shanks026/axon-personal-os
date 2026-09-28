import { HttpError } from './http.js'
import { anthropicCall } from './claude.js'
import { geminiCall } from './gemini.js'

/**
 * Every model Axon may call. Prices are USD per million tokens (input, output, cache read);
 * Gemini is on the free tier for now, so its calls cost $0 (tokens are still logged).
 * A provider is usable once its key secret is set (not a placeholder).
 */
export const MODELS = {
  'gemini-3.8-flash': {
    provider: 'gemini',
    label: 'Gemini 3.8 Flash',
    input: 0,
    output: 0,
    cacheRead: 0,
  },
  'gemini-3.5-flash-lite': {
    provider: 'gemini',
    label: 'Gemini 3.5 Flash-Lite',
    input: 0,
    output: 0,
    cacheRead: 0,
  },
  'claude-sonnet-5': {
    provider: 'anthropic',
    label: 'Sonnet 5',
    input: 2,
    output: 10,
    cacheRead: 0.2,
    effort: true,
  },
  'claude-opus-5-5': {
    provider: 'anthropic',
    label: 'Opus 5.5',
    input: 4,
    output: 20,
    cacheRead: 0.2,
    effort: true,
  },
  // Haiku 4.5 has no effort setting (the API rejects it there).
  'claude-haiku-4-5': {
    provider: 'anthropic',
    label: 'Haiku 4.5',
    input: 1,
    output: 5,
    cacheRead: 0.1,
    effort: false,
  },
}

/** Gemini Flash for everything while Claude is unavailable (the user's decision, 2026-09-28). */
export const DEFAULT_MODELS = {
  draft_tasks: 'gemini-3.8-flash',
  checklist: 'gemini-3.8-flash',
  report_weekly: 'gemini-3.8-flash',
  report_quarterly: 'gemini-3.8-flash',
  chat: 'gemini-3.8-flash',
}

const KEYS = {
  anthropic: { env: 'ANTHROPIC_API_KEY', placeholder: /^sk-ant-REPLACE/i },
  gemini: { env: 'GEMINI_API_KEY', placeholder: /REPLACE/i },
}

/** The provider's key, or null while it's missing or still a placeholder. */
export function providerKey(provider) {
  const { env, placeholder } = KEYS[provider]
  const key = Deno.env.get(env) ?? ''
  return key.length > 20 && !placeholder.test(key) ? key : null
}

export const providerStatus = () => ({
  gemini: !!providerKey('gemini'),
  anthropic: !!providerKey('anthropic'),
})

/**
 * The model to use: the request's (if allowed and its provider has a key), else the saved default
 * for the job, else the built-in one. Nothing usable → `ai_not_configured`.
 */
export function resolveModel(job, requested, aiSettings) {
  const usable = (id) => MODELS[id] && providerKey(MODELS[id].provider)
  if (requested) {
    if (!MODELS[requested]) throw new HttpError(400, 'bad_model', `Model not allowed: ${requested}`)
    if (!usable(requested)) {
      throw new HttpError(
        409,
        'provider_not_configured',
        `${MODELS[requested].label} needs its API key first.`,
      )
    }
    return requested
  }
  const saved = aiSettings?.models?.[job]
  if (usable(saved)) return saved
  if (usable(DEFAULT_MODELS[job])) return DEFAULT_MODELS[job]
  const any = Object.keys(MODELS).find(usable)
  if (any) return any
  throw new HttpError(409, 'ai_not_configured', "AI isn't set up yet: add GEMINI_API_KEY.")
}

/** Usage is normalised by the adapters to `{ input_tokens, output_tokens, cache_read_input_tokens }`. */
export function costOf(model, usage) {
  const p = MODELS[model]
  const usd =
    ((usage?.input_tokens ?? 0) * p.input +
      (usage?.cache_creation_input_tokens ?? 0) * p.input * 1.25 +
      (usage?.cache_read_input_tokens ?? 0) * p.cacheRead +
      (usage?.output_tokens ?? 0) * p.output) /
    1_000_000
  return Math.round(usd * 1_000_000) / 1_000_000
}

/**
 * One structured-output call on whichever provider serves `model`: returns `{ data, usage }`,
 * `data` being JSON that matches `schema`. Errors are HttpErrors with readable messages.
 */
export function structuredCall({ model, ...rest }) {
  const m = MODELS[model]
  const key = providerKey(m.provider)
  if (!key)
    throw new HttpError(409, 'provider_not_configured', `${m.label} needs its API key first.`)
  const call = m.provider === 'gemini' ? geminiCall : anthropicCall
  return call({ key, model, effort: m.effort, ...rest })
}
