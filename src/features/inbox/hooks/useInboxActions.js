import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { useSpace } from '@/context/SpaceContext'
import {
  useDiscardItem,
  useDiscardItems,
  useMoveItem,
  useMoveItems,
  useProcessItem,
  useRestoreItem,
  useRestoreItems,
} from '@/features/inbox/api'
import { useConvertInboxItem } from '@/features/inbox/hooks/useConvertInboxItem'
import { splitCapture } from '@/features/inbox/utils'

const plural = (n) => `${n} ${n === 1 ? 'item' : 'items'}`

/**
 * Everything an inbox item can become, shared by the row buttons and the keys (so they can't
 * drift): `run(kind, item, extra)` with kind task | event (opens their dialog, `dialog` state),
 * todo | note (created directly), move (`extra` = space id or null), discard (Undo). `bulk`
 * moves or discards several ids at once. `processed(as)` is the dialogs' `onSuccess`.
 */
export function useInboxActions() {
  const { spaceById } = useSpace()
  const convert = useConvertInboxItem()
  const process = useProcessItem()
  const discard = useDiscardItem()
  const restore = useRestoreItem()
  const move = useMoveItem()
  const discardMany = useDiscardItems()
  const restoreMany = useRestoreItems()
  const moveMany = useMoveItems()
  const [dialog, setDialog] = useState(null) // { kind: 'task' | 'event', item }
  const spaceName = useCallback((id) => spaceById.get(id)?.name ?? 'Unsorted', [spaceById])

  const run = (kind, item, extra) => {
    if (kind === 'task' || kind === 'event') setDialog({ kind, item })
    else if (kind === 'todo' || kind === 'note') convert(item, kind)
    else if (kind === 'move') {
      move.mutate(
        { id: item.id, spaceId: extra },
        { onSuccess: () => toast.success(`Moved to ${spaceName(extra)}`) },
      )
    } else if (kind === 'discard') {
      discard.mutate(
        { id: item.id },
        {
          onSuccess: () =>
            toast('Discarded', {
              description: splitCapture(item.body).title,
              action: { label: 'Undo', onClick: () => restore.mutate(item.id) },
            }),
        },
      )
    }
  }

  const bulk = {
    discard: (ids, { onDone } = {}) =>
      discardMany.mutate(
        { ids },
        {
          onSuccess: () =>
            toast(`Discarded ${plural(ids.length)}`, {
              action: { label: 'Undo', onClick: () => restoreMany.mutate(ids) },
            }),
          onSettled: onDone,
        },
      ),
    move: (ids, spaceId, { onDone } = {}) =>
      moveMany.mutate(
        { ids, spaceId },
        {
          onSuccess: () => toast.success(`Moved ${plural(ids.length)} to ${spaceName(spaceId)}`),
          onSettled: onDone,
        },
      ),
  }

  const processed = (as) => (row) => {
    if (dialog?.item) process.mutate({ id: dialog.item.id, as, ref: row.id })
  }

  return { run, bulk, dialog, closeDialog: () => setDialog(null), processed }
}
