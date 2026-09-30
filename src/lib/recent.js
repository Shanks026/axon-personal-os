// The palette's "Recent": the last entities opened, newest first, per device (localStorage).
// Every storage access is guarded: private windows and blocked storage just mean no history.

const KEY = 'axon:recent'
const MAX = 8

export function readRecent() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(list) ? list.filter((e) => e?.entity_type && e?.id) : []
  } catch {
    return []
  }
}

function write(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    // Storage full or blocked: carry on without history.
  }
}

/** Moves `entity` to the front (deduped on type + id), keeping the newest 8. Returns the list. */
export function pushRecent(entity, now = new Date()) {
  if (!entity?.entity_type || !entity?.id) return readRecent()
  const item = {
    entity_type: entity.entity_type,
    id: entity.id,
    space_id: entity.space_id ?? null,
    title: entity.title ?? '',
    status: entity.status ?? null,
    openedAt: now.toISOString(),
  }
  const list = [
    item,
    ...readRecent().filter((e) => !(e.entity_type === item.entity_type && e.id === item.id)),
  ].slice(0, MAX)
  write(list)
  return list
}

export function removeRecent(entityType, id) {
  const list = readRecent().filter((e) => !(e.entity_type === entityType && e.id === id))
  write(list)
  return list
}
