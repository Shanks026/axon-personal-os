import { useEffect } from 'react'
import { pushRecent } from '@/lib/recent'

/**
 * Records an opened entity in the palette's Recent list (`lib/recent.js`) when its id changes.
 * `entity` is `{ entity_type, id, space_id, title, status? }`, or null while it loads.
 */
export function useRecordRecent(entity) {
  const key = entity ? `${entity.entity_type}:${entity.id}` : null
  const title = entity?.title
  useEffect(() => {
    if (key) pushRecent(entity)
    // Re-record only when the entity (or its title) changes, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, title])
}
