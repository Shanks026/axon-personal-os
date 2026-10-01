import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useShortcut } from '@/hooks/useShortcut'
import { useShortcutScope } from '@/hooks/useShortcutScope'
import { useListNavigation } from '@/hooks/useListNavigation'
import { listItem } from '@/components/motion/presets'
import { InboxBulkBar } from '@/features/inbox/components/InboxBulkBar'
import { InboxItemRow } from '@/features/inbox/components/InboxItemRow'
import { useInboxSelection } from '@/features/inbox/hooks/useInboxSelection'

/**
 * The open inbox with keyboard triage (Feature 13 Phase 2). J / K select a row, then T task,
 * D todo, N note, E event, M move, ⌫ discard, X pick it for bulk; the selection moves on to the
 * next row after each. With rows picked (X, click or Shift+click), M and ⌫ act on all of them and
 * the bulk bar shows. `actions` is `useInboxActions()`.
 */
export function InboxList({ items, spaceById, showSpace, actions }) {
  const ids = useMemo(() => items.map((i) => i.id), [items])
  const picks = useInboxSelection(ids)
  const { selectedId, getRowProps } = useListNavigation({ items })
  const selected = items.find((i) => i.id === selectedId) ?? null
  const [moveFor, setMoveFor] = useState(null) // the row whose move menu is open
  const [bulkMoveOpen, setBulkMoveOpen] = useState(false)

  // The triage keys, on while a row is selected; their letters win over the global ones.
  useShortcutScope('inbox', !!selected)
  const on = { enabled: !!selected }
  const act = (kind) => () => selected && actions.run(kind, selected)
  useShortcut('inbox.toTask', act('task'), on)
  useShortcut('inbox.toTodo', act('todo'), on)
  useShortcut('inbox.toNote', act('note'), on)
  useShortcut('inbox.toEvent', act('event'), on)
  useShortcut('inbox.select', () => selected && picks.toggle(selected.id), on)
  useShortcut(
    'inbox.move',
    () => (picks.count ? setBulkMoveOpen(true) : selected && setMoveFor(selected.id)),
    on,
  )
  useShortcut(
    'inbox.discard',
    () =>
      picks.count
        ? actions.bulk.discard([...picks.selectedIds], { onDone: picks.clear })
        : act('discard')(),
    on,
  )

  return (
    <>
      <ul className="flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {items.map((it) => (
            <motion.li
              key={it.id}
              layout
              variants={listItem}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <InboxItemRow
                item={it}
                space={it.space_id ? spaceById.get(it.space_id) : null}
                showSpace={showSpace}
                onAction={actions.run}
                rowProps={getRowProps(it.id)}
                checked={picks.isSelected(it.id)}
                showCheck={picks.count > 0}
                onCheck={(e) => (e.shiftKey ? picks.toggleRange(it.id) : picks.toggle(it.id))}
                moveOpen={moveFor === it.id}
                onMoveOpenChange={(open) => setMoveFor(open ? it.id : null)}
              />
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      <AnimatePresence>
        {picks.count > 0 && (
          <InboxBulkBar
            count={picks.count}
            moveOpen={bulkMoveOpen}
            onMoveOpenChange={setBulkMoveOpen}
            onMove={(spaceId) =>
              actions.bulk.move([...picks.selectedIds], spaceId, { onDone: picks.clear })
            }
            onDiscard={() => actions.bulk.discard([...picks.selectedIds], { onDone: picks.clear })}
            onClear={picks.clear}
          />
        )}
      </AnimatePresence>
    </>
  )
}
