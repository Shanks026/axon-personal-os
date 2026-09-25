import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  AlignLeft,
  ArrowUpRight,
  Clock,
  MapPin,
  SquareCheckBig,
  Trash2,
  Video,
  X,
} from 'lucide-react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { formatWeekdayDate, todayISO } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { useSpace } from '@/context/SpaceContext'
import { useDefaultSpaceId } from '@/hooks/useDefaultSpaceId'
import { DatePicker } from '@/components/shared/DatePicker'
import { EntityLink } from '@/components/shared/EntityLink'
import { Kbd } from '@/components/shared/Kbd'
import { SpaceIcon } from '@/components/shared/SpaceIcon'
import { TitleTextarea } from '@/components/shared/TitleTextarea'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  useCreateEvent,
  useDeleteEvent,
  useRestoreEvent,
  useUpdateEvent,
} from '@/features/calendar/api'
import { eventSchema } from '@/features/calendar/schemas'
import {
  endAfter,
  fromEvent,
  minutesBetween,
  newEventDefaults,
  toEventTimestamps,
} from '@/features/calendar/utils'
import { TaskPickerDialog } from '@/features/links/components/TaskPickerDialog'
import { usePreferences } from '@/features/settings/api'
import { useTaskSummary } from '@/features/tasks/api'

/**
 * Create (no `event`) or edit an event (design: Overlays → event): a large title, then read-style
 * icon rows for the time, location, meeting link, description, linked task and space.
 *
 * Mountable standalone (it reads `useSpace()` and `usePreferences()` itself), so the command
 * palette (12) and the inbox (13) can open it anywhere. `initialValues` is merged over the
 * defaults on create (e.g. `{ start_date }` from a clicked day); `onSuccess(row)` runs after a
 * save, just before the dialog closes. An event's space is fixed at creation (no picker).
 */
export function EventDialog({ open, onOpenChange, event, initialValues, onSuccess }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-dialog flex-col gap-0 overflow-hidden p-0 will-change-transform sm:max-w-130"
      >
        <EventForm
          event={event}
          initialValues={initialValues}
          onClose={() => onOpenChange(false)}
          onSuccess={onSuccess}
        />
      </DialogContent>
    </Dialog>
  )
}

/** One read-style row: a muted 15px icon (or `iconNode`), then the content. */
function Row({ icon: Icon, iconNode, label, children, className }) {
  return (
    <div className={cn('flex min-h-9.5 items-center gap-3', className)}>
      {iconNode ?? <Icon className="size-3.75 shrink-0 text-muted-foreground" aria-label={label} />}
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">{children}</div>
    </div>
  )
}

const BARE_INPUT =
  'h-8 border-0 bg-transparent px-1.5 shadow-none hover:bg-accent focus-visible:bg-transparent dark:bg-transparent'

function DateButton({ value, onChange, weekStartsOn, label }) {
  return (
    <DatePicker
      value={value}
      onChange={(v) => v && onChange(v)}
      clearable={false}
      weekStartsOn={weekStartsOn}
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="px-1.5 font-mono font-normal"
        aria-label={label}
      >
        {formatWeekdayDate(value)}
      </Button>
    </DatePicker>
  )
}

function LinkedTask({ taskId, onRemove }) {
  const { data: task } = useTaskSummary(taskId)
  return (
    <span className="group/linked flex min-w-0 items-center gap-1">
      <EntityLink
        kind="task"
        id={taskId}
        spaceId={task?.space_id}
        label={task?.title ?? 'Loading…'}
        status={task?.status}
        deleted={!!task?.deleted_at}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={onRemove}
        aria-label="Unlink task"
        className="text-muted-foreground opacity-0 group-hover/linked:opacity-100 focus-visible:opacity-100"
      >
        <X />
      </Button>
    </span>
  )
}

function EventForm({ event, initialValues, onClose, onSuccess }) {
  const isEdit = !!event
  const { spaceById } = useSpace()
  const { weekStartsOn, timezone } = usePreferences()
  const spaceId = useDefaultSpaceId(initialValues?.space_id ?? event?.space_id)
  const space = spaceById.get(spaceId)
  const create = useCreateEvent()
  const update = useUpdateEvent()
  const remove = useDeleteEvent()
  const restore = useRestoreEvent()
  const [pickingTask, setPickingTask] = useState(false)

  const form = useForm({
    resolver: zodResolver(eventSchema),
    defaultValues: event
      ? {
          space_id: event.space_id,
          title: event.title,
          location: event.location ?? '',
          url: event.url ?? '',
          description: event.description ?? '',
          task_id: event.task_id ?? null,
          ...fromEvent(event, timezone),
        }
      : { ...newEventDefaults(todayISO(timezone)), ...initialValues, space_id: spaceId },
  })
  const [allDay, startDate, startTime, endDate, endTime, url, taskId] = useWatch({
    control: form.control,
    name: ['all_day', 'start_date', 'start_time', 'end_date', 'end_time', 'url', 'task_id'],
  })
  const errors = form.formState.errors
  const pending = create.isPending || update.isPending
  const set = (name, value) =>
    form.setValue(name, value, { shouldDirty: true, shouldValidate: form.formState.isSubmitted })

  // Moving the start keeps the duration (whole days for all-day events).
  const moveStart = (date, time) => {
    const minutes = Math.max(0, minutesBetween(startDate, startTime, endDate, endTime))
    set('start_date', date)
    set('start_time', time)
    const end = endAfter(date, time, minutes)
    set('end_date', end.end_date)
    set('end_time', end.end_time)
  }

  const onSubmit = form.handleSubmit((values) => {
    const payload = {
      title: values.title,
      location: values.location || null,
      url: values.url || null,
      description: values.description || null,
      task_id: values.task_id,
      ...toEventTimestamps(values, timezone),
    }
    const done = (row) => {
      onSuccess?.(row)
      if (!isEdit) toast.success('Event created')
      onClose()
    }
    if (isEdit) update.mutate({ id: event.id, patch: payload }, { onSuccess: done })
    else create.mutate({ ...payload, space_id: spaceId }, { onSuccess: done })
  })

  // The delete is optimistic and the dialog closes at once (unmounting this form, so per-call
  // mutate callbacks wouldn't fire): the Undo toast shows straight away. A failure rolls the chip
  // back and toasts from the hook.
  const onDelete = () => {
    const id = event.id
    remove.mutate(id)
    toast('Event moved to Trash', { action: { label: 'Undo', onClick: () => restore.mutate(id) } })
    onClose()
  }

  const joinable = /^https?:\/\/\S+$/i.test((url ?? '').trim())

  return (
    <>
      <form
        onSubmit={onSubmit}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            onSubmit()
          }
        }}
        noValidate
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="flex shrink-0 items-start gap-3 px-5 pt-5 pb-1">
          <div className="min-w-0 flex-1">
            <DialogHeader>
              <DialogTitle>{isEdit ? 'Edit event' : 'New event'}</DialogTitle>
              <DialogDescription>
                {isEdit
                  ? 'Update the details of this event.'
                  : 'Add a meeting or anything with a time to your calendar.'}
              </DialogDescription>
            </DialogHeader>
          </div>
          <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
            <X />
          </Button>
        </div>

        {/* Only this middle part scrolls; the header and footer stay pinned. */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-3 pb-4">
          <Controller
            name="title"
            control={form.control}
            render={({ field }) => (
              <TitleTextarea
                ref={field.ref}
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                label="Event title"
                placeholder="Event title"
                maxLength={200}
                aria-invalid={!!errors.title}
                autoFocus={!isEdit}
                className="w-full text-xl leading-snug"
              />
            )}
          />
          {errors.title && <p className="mt-1 text-xs text-destructive">{errors.title.message}</p>}

          <div className="mt-3 flex flex-col gap-0.5">
            <Row icon={Clock} label="When">
              <DateButton
                value={startDate}
                label="Start date"
                weekStartsOn={weekStartsOn}
                onChange={(d) => moveStart(d, startTime)}
              />
              {!allDay && (
                <Input
                  type="time"
                  step={900}
                  aria-label="Start time"
                  value={startTime}
                  onChange={(e) => e.target.value && moveStart(startDate, e.target.value)}
                  className={cn(BARE_INPUT, 'w-auto font-mono')}
                />
              )}
              <span className="px-0.5 text-muted-foreground">–</span>
              {!allDay && (
                <Input
                  type="time"
                  step={900}
                  aria-label="End time"
                  value={endTime}
                  onChange={(e) => e.target.value && set('end_time', e.target.value)}
                  className={cn(BARE_INPUT, 'w-auto font-mono')}
                />
              )}
              <DateButton
                value={endDate}
                label="End date"
                weekStartsOn={weekStartsOn}
                onChange={(d) => set('end_date', d)}
              />
              <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                All day
                <Switch size="sm" checked={allDay} onCheckedChange={(v) => set('all_day', v)} />
              </label>
            </Row>
            {errors.end_date && (
              <p className="-mt-1 pl-7 text-xs text-destructive">{errors.end_date.message}</p>
            )}

            <Row icon={MapPin} label="Location">
              <Input
                {...form.register('location')}
                placeholder="Add a location"
                aria-invalid={!!errors.location}
                className={cn(BARE_INPUT, 'flex-1')}
              />
            </Row>

            <Row icon={Video} label="Meeting link">
              <Input
                {...form.register('url')}
                type="url"
                placeholder="Add a meeting link"
                aria-invalid={!!errors.url}
                className={cn(BARE_INPUT, 'flex-1')}
              />
              {joinable && (
                <Button type="button" variant="outline" size="xs" asChild>
                  <a href={url.trim()} target="_blank" rel="noreferrer">
                    Join
                    <ArrowUpRight />
                  </a>
                </Button>
              )}
            </Row>
            {errors.url && (
              <p className="-mt-1 pl-7 text-xs text-destructive">{errors.url.message}</p>
            )}

            <Row icon={AlignLeft} label="Description" className="items-start pt-1.5">
              <Textarea
                {...form.register('description')}
                placeholder="Add a description"
                aria-invalid={!!errors.description}
                className="-mt-1.5 min-h-8 flex-1 resize-none border-0 bg-transparent px-1.5 py-1.5 shadow-none hover:bg-accent focus-visible:bg-transparent focus-visible:ring-0 dark:bg-transparent"
              />
            </Row>

            <Row icon={SquareCheckBig} label="Linked task">
              {taskId ? (
                <LinkedTask taskId={taskId} onRemove={() => set('task_id', null)} />
              ) : (
                <button
                  type="button"
                  onClick={() => setPickingTask(true)}
                  className="rounded-md px-1.5 py-1 text-faint outline-none hover:bg-accent hover:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Link a task…
                </button>
              )}
            </Row>

            <Row iconNode={<SpaceIcon icon={space?.icon} size="xs" className="-mx-0.5" />}>
              <span className="px-1.5 text-muted-foreground">
                <span className="sr-only">Space: </span>
                {space?.name}
              </span>
            </Row>
          </div>
        </div>

        <div className="flex h-13 shrink-0 items-center gap-2 border-t px-4">
          {isEdit && (
            <Button type="button" variant="destructive" size="sm" onClick={onDelete}>
              <Trash2 />
              Delete
            </Button>
          )}
          <div className="flex-1" />
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {isEdit ? 'Save' : 'Create event'}
            <Kbd shortcut="mod+enter" className="text-current opacity-60" />
          </Button>
        </div>
      </form>

      <TaskPickerDialog
        open={pickingTask}
        onOpenChange={setPickingTask}
        spaceIds={spaceId ? [spaceId] : undefined}
        description="Search this space's tasks and pick one to link to the event."
        onPick={(task) => set('task_id', task.id)}
      />
    </>
  )
}
