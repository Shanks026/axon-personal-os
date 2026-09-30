import { GLOBAL_SLUG, paths } from '@/lib/paths'
import { zonedParts } from '@/lib/dates'

/**
 * The app URL for a search result or recent entity: `{ entity_type, id, space_id, status }` as
 * `search_all` returns it (`status` carries the journal date and the event's UTC start).
 * `slugFor(spaceId)` gives the space's slug (a null space → Global). Events open on their day in
 * the profile time zone with the event dialog (`?event=`); todos flash in place (`?highlight=`).
 */
export function entityPath(entity, { slugFor, timezone }) {
  const slug = (entity.space_id && slugFor(entity.space_id)) || GLOBAL_SLUG
  const p = paths.space(slug)
  switch (entity.entity_type) {
    case 'task':
      return p.task(entity.id)
    case 'note':
      return p.note(entity.id)
    case 'report':
      return p.report(entity.id)
    case 'journal':
      return p.journal(entity.status)
    case 'todo':
      return p.todos({ highlight: entity.id })
    case 'event': {
      const date = entity.status ? zonedParts(entity.status, timezone)?.isoDate : null
      return p.calendar({ view: 'day', date, event: entity.id })
    }
    default:
      return p.root()
  }
}
