import { cn } from '@/lib/utils'

/**
 * `[{ text, match }]` segments (`parseSnippet`, `highlightTitle`) as text with `<mark>` around the
 * matches. React escapes everything: no HTML from the server is ever injected.
 */
export function HighlightedText({ segments, className }) {
  return (
    <span className={cn('truncate', className)}>
      {segments.map((s, i) =>
        s.match ? (
          <mark key={i} className="rounded-xs bg-warn/25 text-inherit">
            {s.text}
          </mark>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </span>
  )
}
