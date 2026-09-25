import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarArrowUp, CalendarDays, X } from 'lucide-react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { useDefaultSpaceId } from '@/hooks/useDefaultSpaceId'
import { isDocEmpty } from '@/lib/richText'
import { RichTextEditor } from '@/components/editor/RichTextEditor'
import { Kbd } from '@/components/shared/Kbd'
import { PropertyChip } from '@/components/shared/PropertyChip'
import { VersionBadge } from '@/components/shared/VersionBadge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { textClasses } from '@/lib/tint'
import { useImageHandlers } from '@/features/attachments/api'
import { usePreferences } from '@/features/settings/api'
import { useSetTaskTags, useTags } from '@/features/tags/api'
import {
  useCreateTask,
  useCreateTaskLink,
  useCreateTaskLinks,
  useDeleteTaskLink,
  useTask,
  useUpdateTask,
} from '@/features/tasks/api'
import {
  DateChip,
  LinksField,
  TagList,
  TagsChip,
} from '@/features/tasks/components/TaskDialogChips'
import { PriorityMenu, StatusMenu } from '@/features/tasks/components/TaskMenus'
import { VersionsChip } from '@/features/tasks/components/VersionsChip'
import { TASK_PRIORITY_MAP, TASK_STATUS_MAP } from '@/features/tasks/constants'
import { taskSchema } from '@/features/tasks/schemas'
import { textToDoc } from '@/features/tasks/utils'
import { useCreateChecklistItems } from '@/features/todos/api'
import { ChecklistSection } from '@/features/todos/components/ChecklistSection'

/**
 * Create (no `task`) or edit a task (design 04f, Linear-style). Mountable standalone:
 * it only needs SpaceContext. `initialValues` prefills a create; `onSuccess(row)` runs after save.
 * A task's space is fixed at creation (the user's request, 2026-09-25): there is no space picker.
 * The description is the compact rich editor (Feature 06 Phase 3); it still saves with the form
 * (Save / Mod+Enter), not on its own.
 */
export function TaskDialog({ open, onOpenChange, task, initialValues, onSuccess }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-dialog flex-col gap-0 overflow-hidden p-0 sm:max-w-160"
      >
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
  const createLink = useCreateTaskLink(task?.id)
  const createLinks = useCreateTaskLinks()
  const deleteLink = useDeleteTaskLink(task?.id)
  const { weekStartsOn } = usePreferences()
  const defaultSpace = useDefaultSpaceId(initialValues?.space_id ?? task?.space_id)
  const [createMore, setCreateMore] = useState(false)
  const [tagIds, setTagIds] = useState(task?.tag_ids ?? initialValues?.tag_ids ?? [])
  const [links, setLinks] = useState(task?.links ?? initialValues?.links ?? [])
  const [checklist, setChecklist] = useState([])
  // Bumped by Create more, so the (uncontrolled) description editor starts empty again.
  const [editorKey, setEditorKey] = useState(0)
  // The rich description isn't in the list columns: an edit loads it first.
  const detail = useTask(task?.id)
  const descriptionReady = !isEdit || detail.data !== undefined || detail.isError
  const initialDescription = isEdit
    ? (detail.data?.description ?? textToDoc(task.description_text))
    : (initialValues?.description ?? null)
  const createChecklist = useCreateChecklistItems()
  // Images in the description upload to the task's (fixed) space, so they work before it exists.
  const images = useImageHandlers({ spaceId: defaultSpace })

  const blank = {
    title: '',
    description_text: '',
    status: 'todo',
    priority: 'medium',
    start_date: null,
    due_date: null,
    versions: [],
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
          versions: task.versions ?? [],
        }
      : { ...blank, ...initialValues, space_id: defaultSpace },
  })
  const [status, priority, versions] = useWatch({
    control: form.control,
    name: ['status', 'priority', 'versions'],
  })
  const setVersions = (v) => form.setValue('versions', v, { shouldDirty: true })
  const errors = form.formState.errors
  const pending = create.isPending || update.isPending

  // Tags are scoped to the task's own (fixed) space.
  const { data: spaceTags = [] } = useTags({ spaceIds: defaultSpace ? [defaultSpace] : [] })
  const selectedTags = spaceTags.filter((t) => tagIds.includes(t.id))

  const onSubmit = form.handleSubmit((values) => {
    // An untouched description in edit mode stays out of the patch (undefined isn't sent).
    const payload = isEdit ? values : { ...values, description: values.description ?? null }
    const done = (row) => {
      setTaskTags.mutate({ taskId: row.id, tagIds })
      if (!isEdit && links.length) createLinks.mutate({ taskId: row.id, links })
      if (!isEdit && checklist.length) {
        createChecklist.mutate({ taskId: row.id, spaceId: row.space_id, titles: checklist })
      }
      onSuccess?.(row)
      if (!isEdit && createMore) {
        toast.success('Task created', { description: row.title })
        form.reset({ ...values, title: '', description: null, description_text: '' })
        setEditorKey((k) => k + 1)
        form.setFocus('title')
        setTagIds([])
        setLinks([])
        setChecklist([])
        return
      }
      if (!isEdit) toast.success('Task created')
      onClose()
    }
    if (isEdit) update.mutate({ id: task.id, patch: payload }, { onSuccess: done })
    else create.mutate({ ...payload, space_id: defaultSpace }, { onSuccess: done })
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
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex shrink-0 items-start gap-3 px-5 pt-5 pb-1">
        <div className="min-w-0 flex-1">
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit task' : 'New task'}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? 'Update the details of this task.'
                : 'Add a piece of work to track, with its status, dates and links.'}
            </DialogDescription>
          </DialogHeader>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <X />
        </Button>
      </div>

      {/* Only this middle part scrolls; the header and footer stay pinned. */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-3 px-5 pt-4">
          <div>
            {/* Versions sit at the far right of the title row, as on the card. */}
            <div className="flex items-center gap-3">
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
                    className="min-w-0 flex-1 bg-transparent text-xl font-semibold tracking-tight outline-none placeholder:text-faint"
                  />
                )}
              />
              {versions.length > 0 && (
                <div className="flex max-w-1/2 shrink-0 flex-wrap justify-end gap-1">
                  {versions.map((v) => (
                    <VersionBadge
                      key={v}
                      version={v}
                      onRemove={(x) => setVersions(versions.filter((y) => y !== x))}
                    />
                  ))}
                </div>
              )}
            </div>
            {errors.title && (
              <p className="mt-1 text-xs text-destructive">{errors.title.message}</p>
            )}
            {descriptionReady ? (
              <RichTextEditor
                key={`${task?.id ?? 'new'}-${editorKey}`}
                variant="compact"
                features={{ images }}
                value={initialDescription}
                label="Description"
                onChange={(json, text) => {
                  form.setValue('description', isDocEmpty(json) ? null : json, {
                    shouldDirty: true,
                  })
                  form.setValue('description_text', text.slice(0, 20_000), { shouldDirty: true })
                }}
                className="mt-1.5 min-h-12 leading-relaxed"
              />
            ) : (
              <div className="mt-2.5 flex min-h-12 flex-col gap-2" aria-hidden>
                <Skeleton className="h-3.5 w-4/5" />
                <Skeleton className="h-3.5 w-1/2" />
              </div>
            )}
          </div>
          <TagList
            tags={selectedTags}
            onRemove={(tag) => setTagIds(tagIds.filter((id) => id !== tag.id))}
          />
          <LinksField
            taskId={task?.id}
            links={links}
            onLinksChange={setLinks}
            onCreate={(values, onDone) => createLink.mutate(values, { onSuccess: onDone })}
            onDelete={(id) => deleteLink.mutate(id)}
          />
        </div>

        <div className="flex flex-wrap gap-1.5 px-5 pt-4 pb-5">
          <StatusMenu value={status} onChange={(v) => form.setValue('status', v)} hoverOpen>
            <PropertyChip
              icon={StatusIcon}
              iconClassName={textClasses(TASK_STATUS_MAP[status].color)}
            >
              {TASK_STATUS_MAP[status].label}
            </PropertyChip>
          </StatusMenu>
          <PriorityMenu value={priority} onChange={(v) => form.setValue('priority', v)} hoverOpen>
            <PropertyChip
              icon={PriorityIcon}
              iconProps={{ color: TASK_PRIORITY_MAP[priority].color }}
              iconClassName="size-2"
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
          <TagsChip spaceId={defaultSpace} value={tagIds} onChange={setTagIds} />
          <VersionsChip spaceId={defaultSpace} value={versions} onChange={setVersions} />
        </div>
        {(errors.due_date || errors.space_id) && (
          <p className="-mt-2 px-5 pb-3 text-xs text-destructive">
            {errors.due_date?.message ?? errors.space_id?.message}
          </p>
        )}

        {isEdit ? (
          <ChecklistSection taskId={task.id} spaceId={task.space_id} />
        ) : (
          <ChecklistSection staged={{ items: checklist, onChange: setChecklist }} />
        )}
      </div>

      <div className="flex h-13 shrink-0 items-center gap-2.5 border-t px-4">
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
