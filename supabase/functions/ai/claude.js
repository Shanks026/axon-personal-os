import Anthropic from 'npm:@anthropic-ai/sdk@0.128.0'
import { HttpError } from './http.js'

const clients = new Map()
const clientFor = (key) => {
  if (!clients.has(key)) clients.set(key, new Anthropic({ apiKey: key, maxRetries: 2 }))
  return clients.get(key)
}

/**
 * Claude structured output (`output_config.format` JSON schema). `effort` says whether the model
 * takes an effort level (Haiku 4.5 doesn't). Returns `{ data, usage }` with Anthropic's usage.
 */
export async function anthropicCall({
  key,
  model,
  effort,
  system,
  user,
  schema,
  effortLevel = 'low',
  maxTokens = 16000,
}) {
  const output_config = { format: { type: 'json_schema', schema } }
  if (effort) output_config.effort = effortLevel

  let response
  try {
    response = await clientFor(key).messages.create({
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
  try {
    return { data: JSON.parse(text), usage: response.usage }
  } catch {
    throw new HttpError(502, 'bad_output', 'The model returned something unreadable. Try again.')
  }
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
