import { EventDialog } from '@/features/calendar/components/EventDialog'
import { captureToTask, splitCapture } from '@/features/inbox/utils'
import { TaskDialog } from '@/features/tasks/components/TaskDialog'

/**
 * The task and event dialogs an inbox item opens (Task / Event, or T / E), prefilled from its
 * text, in its space (the default space when Unsorted). `onSuccess` marks the item processed.
 * `dialog` is `useInboxActions().dialog`.
 */
export function InboxConvertDialogs({ dialog, onClose, processed }) {
  const item = dialog?.item
  const inSpace = item?.space_id ? { space_id: item.space_id } : {}
  const onOpenChange = (open) => !open && onClose()
  return (
    <>
      <TaskDialog
        open={dialog?.kind === 'task'}
        onOpenChange={onOpenChange}
        initialValues={item ? { ...captureToTask(item.body), ...inSpace } : undefined}
        onSuccess={processed('task')}
      />
      <EventDialog
        open={dialog?.kind === 'event'}
        onOpenChange={onOpenChange}
        initialValues={
          item
            ? {
                title: splitCapture(item.body).title,
                description: splitCapture(item.body).body,
                ...inSpace,
              }
            : undefined
        }
        onSuccess={processed('event')}
      />
    </>
  )
}
