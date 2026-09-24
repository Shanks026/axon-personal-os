import { useEffect, useRef, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarArrowUp, CalendarDays, ChevronRight, X } from 'lucide-react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { useDefaultSpaceId } from '@/hooks/useDefaultSpaceId'
import { Kbd } from '@/components/shared/Kbd'
import { PropertyChip } from '@/components/shared/PropertyChip'
import { SpaceChipPicker } from '@/components/shared/SpaceChipPicker'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { usePreferences } from '@/features/settings/api'
import { useSetTaskTags, useTags } from '@/features/tags/api'
import { useCreateTask, useUpdateTask } from '@/features/tasks/api'
import { DateChip, LinkChip, TagsChip } from '@/features/tasks/components/TaskDialogChips'
import { PriorityMenu, StatusMenu } from '@/features/tasks/components/TaskMenus'
import { TASK_PRIORITY_MAP, TASK_STATUS_MAP } from '@/features/tasks/constants'
import { taskSchema } from '@/features/tasks/schemas'
import { textToDoc } from '@/features/tasks/utils'

/**
 * Create (no `task`) or edit a task (design 04f, Linear-style). Mountable standalone:
 * it only needs SpaceContext. `initialValues` prefills a create; `onSuccess(row)` runs after save.
 */
export function TaskDialog({ open, onOpenChange, task, initialValues, onSuccess }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="gap-0 overflow-visible p-0 sm:max-w-160">
        <TaskForm
          task={task}
          initialValues={initialValues}
          onClose={() => onOpenChange(false)}
          onSuccess={onSuccess}
        />
      </DialogContent>
    </Dialog>
  )
}

function TaskForm({ task, initialValues, onClose, onSuccess }) {
  const isEdit = !!task
  const create = useCreateTask()
  const update = useUpdateTask()
  const setTaskTags = useSetTaskTags()
  const { weekStartsOn } = usePreferences()
  const defaultSpace = useDefaultSpaceId(initialValues?.space_id)
  const [createMore, setCreateMore] = useState(false)
  const [tagIds, setTagIds] = useState(task?.tag_ids ?? initialValues?.tag_ids ?? [])

  const blank = {
    space_id: defaultSpace,
    title: '',
    description_text: '',
    status: 'todo',
    priority: 'none',
    start_date: null,
    due_date: null,
    external_url: '',
  }
  const form = useForm({
    resolver: zodResolver(taskSchema),
    defaultValues: task
      ? {
          space_id: task.space_id,
          title: task.title,
          description_text: task.description_text ?? '',
          status: task.status,
          priority: task.priority,
          start_date: task.start_date,
          due_date: task.due_date,
          external_url: task.external_url ?? '',
        }
      : { ...blank, ...initialValues, space_id: defaultSpace },
  })
  const [status, priority, externalUrl, spaceId] = useWatch({
    control: form.control,
    name: ['status', 'priority', 'external_url', 'space_id'],
  })
  const errors = form.formState.errors
  const pending = create.isPending || update.isPending

  // Changing the space (Global only) drops tags scoped to a different space.
  const { data: spaceTags = [] } = useTags({ spaceIds: spaceId ? [spaceId] : [] })
  const prevSpaceId = useRef(spaceId)
  useEffect(() => {
    if (spaceId === prevSpaceId.current) return
    prevSpaceId.current = spaceId
    setTagIds((ids) => ids.filter((id) => spaceTags.some((t) => t.id === id)))
  }, [spaceId, spaceTags])

  const onSubmit = form.handleSubmit((values) => {
    const payload = { ...values, description: textToDoc(values.description_text) }
    const done = (row) => {
      setTaskTags.mutate({ taskId: row.id, tagIds })
      onSuccess?.(row)
      if (!isEdit && createMore) {
        toast.success('Task created', { description: row.title })
        form.reset({ ...values, title: '', description_text: '' })
        form.setFocus('title')
        setTagIds([])
        return
      }
      if (!isEdit) toast.success('Task created')
      onClose()
    }
    if (isEdit) update.mutate({ id: task.id, patch: payload }, { onSuccess: done })
    else create.mutate(payload, { onSuccess: done })
  })

  const StatusIcon = TASK_STATUS_MAP[status].icon
  const PriorityIcon = TASK_PRIORITY_MAP[priority].icon

  return (
    <form
      onSubmit={onSubmit}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault()
          onSubmit()
        }
      }}
      noValidate
    >
      <div className="flex items-center gap-2 px-5 pt-3.5 text-xs text-muted-foreground">
        <Controller
          name="space_id"
          control={form.control}
          render={({ field }) => <SpaceChipPicker value={field.value} onChange={field.onChange} />}
        />
        <ChevronRight className="size-3 text-faint" aria-hidden />
        <DialogTitle className="text-xs font-normal text-muted-foreground">
          {isEdit ? 'Edit task' : 'New task'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Title, description, status, priority, dates and link.
        </DialogDescription>
        <div className="flex-1" />
        <Button type="button" variant="ghost" size="icon-xs" onClick={onClose} aria-label="Close">
          <X />
        </Button>
      </div>

      <div className="px-5 pt-3">
        <Controller
          name="title"
          control={form.control}
          render={({ field }) => (
            <input
              {...field}
              placeholder="Task title"
              aria-label="Task title"
              aria-invalid={!!errors.title}
              autoFocus
              autoComplete="off"
              className="w-full bg-transparent text-xl font-semibold tracking-tight outline-none placeholder:text-faint"
            />
          )}
        />
        {errors.title && <p className="mt-1 text-xs text-destructive">{errors.title.message}</p>}
        <textarea
          {...form.register('description_text')}
          placeholder="Add description…"
          aria-label="Description"
          rows={2}
          className="mt-1.5 field-sizing-content max-h-60 min-h-12 w-full resize-none bg-transparent leading-relaxed outline-none placeholder:text-faint"
        />
      </div>

      <div className="flex flex-wrap gap-1.5 px-5 pt-2 pb-4">
        <StatusMenu value={status} onChange={(v) => form.setValue('status', v)}>
          <PropertyChip
            icon={StatusIcon}
            iconStyle={{ color: TASK_STATUS_MAP[status].iconTone ?? TASK_STATUS_MAP[status].tone }}
          >
            {TASK_STATUS_MAP[status].label}
          </PropertyChip>
        </StatusMenu>
        <PriorityMenu value={priority} onChange={(v) => form.setValue('priority', v)}>
          <PropertyChip
            icon={PriorityIcon}
            iconStyle={{ color: TASK_PRIORITY_MAP[priority].tone }}
            empty={priority === 'none'}
          >
            {priority === 'none' ? 'Priority' : TASK_PRIORITY_MAP[priority].label}
          </PropertyChip>
        </PriorityMenu>
        <DateChip
          form={form}
          name="start_date"
          label="Start"
          icon={CalendarArrowUp}
          weekStartsOn={weekStartsOn}
        />
        <DateChip
          form={form}
          name="due_date"
          label="Due"
          icon={CalendarDays}
          weekStartsOn={weekStartsOn}
        />
        <TagsChip spaceId={spaceId} tags={spaceTags} value={tagIds} onChange={setTagIds} />
        <LinkChip form={form} value={externalUrl} />
      </div>
      {(errors.due_date || errors.external_url || errors.space_id) && (
        <p className="-mt-2 px-5 pb-3 text-xs text-destructive">
          {errors.due_date?.message ?? errors.external_url?.message ?? errors.space_id?.message}
        </p>
      )}

      <div className="flex h-13 items-center gap-2.5 border-t px-4">
        {!isEdit && (
          <label className="flex items-center gap-2 text-muted-foreground">
            <Switch checked={createMore} onCheckedChange={setCreateMore} size="sm" />
            Create more
          </label>
        )}
        <div className="flex-1" />
        <Button type="submit" disabled={pending}>
          {isEdit ? 'Save changes' : 'Create task'}
          <Kbd shortcut="mod+enter" className="text-current opacity-60" />
        </Button>
      </div>
    </form>
  )
}
