import { HttpError } from './http.js'

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models'
const TIMEOUT_MS = 60_000

/**
 * Gemini structured output through `generateContent` (raw HTTP; no SDK): `responseMimeType:
 * application/json` with `responseJsonSchema` (the same JSON Schema the Claude path uses) and a
 * low thinking level. Returns `{ data, usage }` with usage mapped to Anthropic's field names, so
 * logging and cost work the same for every provider.
 */
export async function geminiCall({
  key,
  model,
  system,
  user,
  schema,
  effortLevel = 'low',
  maxTokens = 16000,
}) {
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: user }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseJsonSchema: schema,
      maxOutputTokens: maxTokens,
      thinkingConfig: { thinkingLevel: effortLevel },
    },
  }

  let res
  try {
    res = await fetch(`${BASE}/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch {
    throw new HttpError(502, 'unreachable', "Couldn't reach Google's AI service. Try again.")
  }

  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw toHttpError(res.status, json?.error)

  if (json.promptFeedback?.blockReason) {
    throw new HttpError(422, 'refused', 'The model declined this request. Try rephrasing it.')
  }
  const candidate = json.candidates?.[0]
  const reason = candidate?.finishReason
  if (reason === 'MAX_TOKENS') {
    throw new HttpError(422, 'too_long', 'The answer was cut off. Try a shorter description.')
  }
  if (reason && reason !== 'STOP') {
    throw new HttpError(422, 'refused', 'The model declined this request. Try rephrasing it.')
  }
  // Thought parts (if any) are flagged `thought: true`; the answer is the rest.
  const text = (candidate?.content?.parts ?? [])
    .filter((p) => !p.thought && typeof p.text === 'string')
    .map((p) => p.text)
    .join('')

  const meta = json.usageMetadata ?? {}
  const usage = {
    input_tokens: meta.promptTokenCount ?? 0,
    output_tokens: (meta.candidatesTokenCount ?? 0) + (meta.thoughtsTokenCount ?? 0),
    cache_read_input_tokens: meta.cachedContentTokenCount ?? 0,
  }
  try {
    return { data: JSON.parse(text), usage }
  } catch {
    throw new HttpError(502, 'bad_output', 'The model returned something unreadable. Try again.')
  }
}

function toHttpError(status, error) {
  const message = error?.message ?? ''
  if (status === 400 && /api key/i.test(message)) {
    return new HttpError(502, 'bad_key', 'The Gemini API key was rejected. Check GEMINI_API_KEY.')
  }
  if (status === 401 || status === 403) {
    return new HttpError(502, 'bad_key', 'The Gemini API key was rejected. Check GEMINI_API_KEY.')
  }
  if (status === 404) {
    return new HttpError(502, 'no_access', 'That Gemini model isn’t available to this key.')
  }
  if (status === 429) {
    return new HttpError(
      429,
      'rate_limited',
      'The Gemini free-tier limit was reached. Try again in a minute (or tomorrow for the daily limit).',
    )
  }
  if (status === 400)
    return new HttpError(400, 'bad_request', message || 'Gemini rejected the request.')
  return new HttpError(502, 'api_error', `Gemini error ${status}: ${message || 'unknown'}`)
}
