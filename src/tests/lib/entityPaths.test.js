import { describe, expect, it } from 'vitest'
import { entityPath } from '@/lib/entityPaths'

const slugFor = (id) => ({ s1: 'thmp' })[id]
const opts = { slugFor, timezone: 'Asia/Kolkata' }

describe('entityPath', () => {
  it('builds task, note and report detail URLs in their space', () => {
    expect(entityPath({ entity_type: 'task', id: 't1', space_id: 's1' }, opts)).toBe(
      '/s/thmp/tasks/t1',
    )
    expect(entityPath({ entity_type: 'note', id: 'n1', space_id: 's1' }, opts)).toBe(
      '/s/thmp/notes/n1',
    )
    expect(entityPath({ entity_type: 'report', id: 'r1', space_id: 's1' }, opts)).toBe(
      '/s/thmp/reports/r1',
    )
  })

  it('sends a Global report (no space) to Global', () => {
    expect(entityPath({ entity_type: 'report', id: 'r2', space_id: null }, opts)).toBe(
      '/s/global/reports/r2',
    )
  })

  it('opens a journal day, a highlighted todo and an event on its local day', () => {
    expect(
      entityPath({ entity_type: 'journal', id: 'j', space_id: 's1', status: '2026-09-29' }, opts),
    ).toBe('/s/thmp/journal/2026-09-29')
    expect(entityPath({ entity_type: 'todo', id: 'd1', space_id: 's1' }, opts)).toBe(
      '/s/thmp/todos?highlight=d1',
    )
    // 20:00 UTC on the 29th is the 30th in India.
    expect(
      entityPath(
        { entity_type: 'event', id: 'e1', space_id: 's1', status: '2026-09-29T20:00:00Z' },
        opts,
      ),
    ).toBe('/s/thmp/calendar?view=day&date=2026-09-30&event=e1')
  })
})
