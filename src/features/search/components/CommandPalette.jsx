import { useState } from 'react'
import { useNavigate } from 'react-router'
import { entityPath } from '@/lib/entityPaths'
import { pushRecent, readRecent } from '@/lib/recent'
import { useSpace } from '@/context/SpaceContext'
import { useGlobalDialog } from '@/hooks/useGlobalDialog'
import { Kbd } from '@/components/shared/Kbd'
import {
  Command,
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandList,
} from '@/components/ui/command'
import { useSearch } from '@/features/search/api'
import { PaletteFilterBar } from '@/features/search/components/PaletteFilterBar'
import { PaletteResultItem } from '@/features/search/components/PaletteResultItem'
import { PaletteResults } from '@/features/search/components/PaletteResults'
import { PaletteStaticItem } from '@/features/search/components/PaletteStaticItem'
import { MIN_QUERY, TYPE_FILTERS } from '@/features/search/constants'
import { usePaletteActions } from '@/features/search/hooks/usePaletteActions'
import { groupResults, matchesQuery, nextTypeFilter } from '@/features/search/utils'
import { usePreferences } from '@/features/settings/api'

/**
 * The palette's contents, mounted each time it opens (so the query, scope and filter reset).
 * An empty query lists Recent, Actions, Navigate and Switch space. Two or more characters also
 * search everything in scope (grouped results first). Tab / Shift+Tab cycle the type filter,
 * the chip switches between this space and all spaces, and `page="spaces"` shows just the spaces.
 */
function PaletteBody({ initialPage, onClose, onOpenHelp }) {
  const navigate = useNavigate()
  const { isGlobal, space, scopeSpaceIds, activeSpaces, spaceById } = useSpace()
  const { timezone } = usePreferences()
  const { open: openDialog } = useGlobalDialog()
  const items = usePaletteActions({ onOpenHelp })
  const [q, setQ] = useState('')
  const [page, setPage] = useState(initialPage)
  const [allSpaces, setAllSpaces] = useState(isGlobal)
  const [type, setType] = useState(null)
  const [recent] = useState(readRecent)

  const spaceIds = allSpaces ? activeSpaces.map((s) => s.id) : scopeSpaceIds
  const search = useSearch({
    q,
    spaceIds,
    includeGlobal: allSpaces,
    types: type ? [type] : null,
  })
  const trimmed = q.trim()
  const searching = trimmed.length >= MIN_QUERY
  const groups = searching ? groupResults(search.data) : []
  const slugFor = (id) => spaceById.get(id)?.slug
  const visibleRecent = recent.filter((r) =>
    r.space_id ? spaceIds.includes(r.space_id) : r.entity_type === 'report' && allSpaces,
  )

  const run = (item) => {
    onClose()
    item.run()
  }
  const open = (row) => {
    pushRecent(row)
    onClose()
    navigate(entityPath(row, { slugFor, timezone }))
  }
  const matching = (list) => list.filter((i) => matchesQuery(i.label, trimmed, i.keywords))

  const onKeyDown = (e) => {
    if (e.key === 'Tab' && page === 'root') {
      e.preventDefault()
      setType((t) => nextTypeFilter(TYPE_FILTERS, t, e.shiftKey ? -1 : 1))
    }
    if (e.key === 'Backspace' && !q && page !== 'root') {
      e.preventDefault()
      setPage('root')
    }
  }

  return (
    <Command shouldFilter={false} loop onKeyDown={onKeyDown}>
      <CommandInput
        value={q}
        onValueChange={setQ}
        placeholder={page === 'spaces' ? 'Switch to a space…' : 'Search or jump to…'}
      />
      {page === 'root' && (
        <PaletteFilterBar
          type={type}
          onType={setType}
          allSpaces={allSpaces}
          onToggleScope={() => setAllSpaces((v) => !v)}
          isGlobal={isGlobal}
          space={space}
        />
      )}

      <CommandList className="max-h-96">
        {page === 'spaces' ? (
          <CommandGroup heading="Switch space">
            {matching(items.spaces).map((item) => (
              <PaletteStaticItem key={item.id} item={item} onRun={run} />
            ))}
          </CommandGroup>
        ) : (
          <>
            {searching && (
              <PaletteResults
                search={search}
                groups={groups}
                query={trimmed}
                showSpace={allSpaces}
                spaceById={spaceById}
                onOpen={open}
                onCreate={() => {
                  onClose()
                  openDialog('task', { title: trimmed })
                }}
              />
            )}
            {!trimmed && visibleRecent.length > 0 && (
              <CommandGroup heading="Recent">
                {visibleRecent.map((row) => (
                  <PaletteResultItem
                    key={`${row.entity_type}:${row.id}`}
                    row={row}
                    query=""
                    space={spaceById.get(row.space_id)}
                    showSpace={allSpaces}
                    onSelect={open}
                  />
                ))}
              </CommandGroup>
            )}
            {[
              ['Actions', items.actions],
              ['Navigate', items.navigate],
              ['Switch space', items.spaces],
            ].map(([heading, list]) => {
              const shown = matching(list)
              return shown.length ? (
                <CommandGroup key={heading} heading={heading}>
                  {shown.map((item) => (
                    <PaletteStaticItem key={item.id} item={item} onRun={run} />
                  ))}
                </CommandGroup>
              ) : null
            })}
          </>
        )}
      </CommandList>

      <div className="flex items-center gap-3 border-t px-3 py-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Kbd shortcut="up" />
          <Kbd shortcut="down" /> Move
        </span>
        <span className="flex items-center gap-1">
          <Kbd shortcut="enter" /> Open
        </span>
        {page === 'root' && (
          <span className="flex items-center gap-1">
            <Kbd shortcut="tab" /> Filter
          </span>
        )}
        <div className="flex-1" />
        <span className="flex items-center gap-1">
          <Kbd shortcut="esc" /> Close
        </span>
      </div>
    </Command>
  )
}

/**
 * The command palette (Feature 12): `Ctrl/Cmd+K` or the sidebar's Search. 640px, no backdrop
 * blur (the overlay rule). `initialPage` "spaces" opens straight on the space list.
 * @param {{ open: boolean, onOpenChange: (open: boolean) => void, initialPage?: 'root' | 'spaces' }} props
 */
export function CommandPalette({ open, onOpenChange, initialPage = 'root', onOpenHelp }) {
  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search"
      description="Search tasks, notes, journal, todos, events and reports, or run a command."
      className="will-change-transform sm:max-w-160"
    >
      <PaletteBody
        initialPage={initialPage}
        onClose={() => onOpenChange(false)}
        onOpenHelp={onOpenHelp}
      />
    </CommandDialog>
  )
}
