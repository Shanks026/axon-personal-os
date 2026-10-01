import { textToDoc } from '@/features/tasks/utils'

/** Captured text → `{ title, body }`: the first non-empty line (up to 300), then the rest. */
export function splitCapture(text) {
  const lines = String(text ?? '').split('\n')
  const first = lines.findIndex((l) => l.trim())
  if (first === -1) return { title: '', body: '' }
  return {
    title: lines[first].trim().slice(0, 300),
    body: lines
      .slice(first + 1)
      .join('\n')
      .trim(),
  }
}

/** Captured text as a new note: the first line is the title, the rest paragraphs. */
export function captureToNote(text) {
  const { title, body } = splitCapture(text)
  return { title, content: textToDoc(body), content_text: body }
}

/** Captured text as a task's values: the title, and the rest as its description. */
export function captureToTask(text) {
  const { title, body } = splitCapture(text)
  return { title, description: textToDoc(body), description_text: body }
}

const URL_RE = /https?:\/\/\S+/i

/** The kind an item reads as (the design delta): a link, a question ("?" first), else an idea. */
export function itemKind(body) {
  const text = String(body ?? '').trim()
  if (URL_RE.test(text)) return 'bookmark'
  if (text.startsWith('?') || /^[^\n]*\?\s*$/.test(text.split('\n')[0] ?? '')) return 'question'
  return 'idea'
}
