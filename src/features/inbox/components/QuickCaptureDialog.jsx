import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, Layers } from 'lucide-react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useSpace } from '@/context/SpaceContext'
import { useDefaultSpaceId } from '@/hooks/useDefaultSpaceId'
import { Kbd } from '@/components/shared/Kbd'
import { SegmentedControl } from '@/components/shared/SegmentedControl'
import { SpaceIcon } from '@/components/shared/SpaceIcon'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useCaptureItem } from '@/features/inbox/api'
import { CAPTURE_TYPES } from '@/features/inbox/constants'
import { captureSchema } from '@/features/inbox/schemas'
import { captureToNote, captureToTask, splitCapture } from '@/features/inbox/utils'
import { useCreateNote } from '@/features/notes/api'
import { useSpacePaths } from '@/features/spaces/hooks/useSpacePaths'
import { useCreateTask } from '@/features/tasks/api'
import { useCreateTodo } from '@/features/todos/api'

/** Where a capture lands: the space (or Unsorted), shown read-only; there's no picker. */
function Destination({ type, space }) {
  const label = space ? space.name : 'Unsorted'
  return (
    <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
      <ArrowRight className="size-3.5 shrink-0" aria-hidden />
      {space ? (
        <SpaceIcon icon={space.icon} size="xs" />
      ) : (
        <Layers className="size-3.5 shrink-0" aria-hidden />
      )}
      <span className="truncate">{type === 'inbox' ? `Inbox · ${label}` : label}</span>
    </span>
  )
}

function CaptureForm({ onClose }) {
  const navigate = useNavigate()
  const p = useSpacePaths()
  const { isGlobal, space, spaceById } = useSpace()
  const defaultSpaceId = useDefaultSpaceId()
  const capture = useCaptureItem()
  const createTask = useCreateTask()
  const createTodo = useCreateTodo()
  const createNote = useCreateNote()
  const form = useForm({
    resolver: zodResolver(captureSchema),
    defaultValues: { body: '', type: 'inbox' },
  })
  const [type, body] = useWatch({ control: form.control, name: ['type', 'body'] })
  // Inbox: this space, or Unsorted in Global. Task/Todo/Note: the default space (no pickers).
  const inboxSpaceId = isGlobal ? null : space?.id
  const targetSpaceId = type === 'inbox' ? inboxSpaceId : defaultSpaceId
  const target = targetSpaceId ? spaceById.get(targetSpaceId) : null
  const pending =
    capture.isPending || createTask.isPending || createTodo.isPending || createNote.isPending
  const submitLabel = CAPTURE_TYPES.find((t) => t.value === type)?.submit

  const done = (message, to) => {
    onClose()
    toast.success(message, to ? { action: { label: 'Open', onClick: () => navigate(to) } } : {})
  }

  const onSubmit = form.handleSubmit(async ({ body: text, type: kind }) => {
    try {
      if (kind === 'inbox') {
        await capture.mutateAsync({ body: text, space_id: inboxSpaceId ?? null })
        onClose()
        toast.success('Captured', {
          action: { label: 'Open inbox', onClick: () => navigate(p.inbox()) },
        })
      } else if (kind === 'task') {
        const row = await createTask.mutateAsync({
          ...captureToTask(text),
          space_id: defaultSpaceId,
        })
        done('Task created', p.task(row.id))
      } else if (kind === 'todo') {
        await createTodo.mutateAsync({ title: splitCapture(text).title, space_id: defaultSpaceId })
        done('Todo created', p.todos())
      } else {
        const row = await createNote.mutateAsync({
          ...captureToNote(text),
          space_id: defaultSpaceId,
        })
        done('Note created', p.note(row.id))
      }
    } catch {
      // The mutation hooks toast their own errors; the dialog stays open with the text.
    }
  })

  const cycleType = (step) => {
    const i = CAPTURE_TYPES.findIndex((t) => t.value === type)
    const next = CAPTURE_TYPES[(i + step + CAPTURE_TYPES.length) % CAPTURE_TYPES.length]
    form.setValue('type', next.value)
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col">
      <div className="px-5 pt-5">
        <DialogHeader>
          <DialogTitle>Quick capture</DialogTitle>
          <DialogDescription>
            Save a thought now and sort it later, or make it a task, todo or note straight away.
          </DialogDescription>
        </DialogHeader>
      </div>
      <div className="px-5 pt-4 pb-3">
        <Controller
          name="body"
          control={form.control}
          render={({ field, fieldState }) => (
            <>
              <Textarea
                {...field}
                autoFocus
                rows={3}
                aria-label="What’s on your mind?"
                aria-invalid={fieldState.invalid || undefined}
                placeholder="What’s on your mind?"
                className="max-h-48 min-h-20 resize-none text-base md:text-base"
                onKeyDown={(e) => {
                  if (e.key === 'Tab') {
                    e.preventDefault()
                    cycleType(e.shiftKey ? -1 : 1)
                  } else if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    if (!pending) onSubmit()
                  }
                }}
              />
              {fieldState.error && body?.length > 0 && (
                <p className="mt-1.5 text-xs text-destructive">{fieldState.error.message}</p>
              )}
            </>
          )}
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Controller
            name="type"
            control={form.control}
            render={({ field }) => (
              <SegmentedControl
                label="Capture as"
                value={field.value}
                onChange={field.onChange}
                options={CAPTURE_TYPES.map((t) => ({
                  value: t.value,
                  label: t.label,
                  icon: t.icon,
                }))}
              />
            )}
          />
          <div className="flex-1" />
          <Destination type={type} space={target} />
        </div>
      </div>
      <div className="flex h-13 items-center gap-3 border-t px-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Kbd shortcut="tab" /> Type
        </span>
        <span className="flex items-center gap-1">
          <Kbd shortcut="shift+enter" /> New line
        </span>
        <div className="flex-1" />
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending || !body?.trim()}>
          {submitLabel}
          <Kbd shortcut="enter" className="text-current opacity-60" />
        </Button>
      </div>
    </form>
  )
}

/**
 * Quick capture (Feature 13): ⌘J, the palette or the sidebar. Enter saves (Shift+Enter is a new
 * line), Tab cycles Inbox / Task / Todo / Note. There's no space picker (the user's decision,
 * 2026-09-30): the inbox gets this space, or Unsorted in Global; a task, todo or note goes to the
 * default space. 560px, no "Keep capturing" (the design delta).
 */
export function QuickCaptureDialog({ open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="gap-0 p-0 will-change-transform sm:max-w-140"
      >
        <CaptureForm onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}
