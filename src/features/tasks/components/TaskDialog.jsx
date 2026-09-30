import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowUpRight,
  CalendarArrowUp,
  CalendarDays,
  PenLine,
  Sparkles,
  Ticket,
  X,
} from 'lucide-react'
import { Link } from 'react-router'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { useDefaultSpaceId } from '@/hooks/useDefaultSpaceId'
import { isDocEmpty } from '@/lib/richText'
import { RichTextEditor } from '@/components/editor/RichTextEditor'
import { Kbd } from '@/components/shared/Kbd'
import { TitleTextarea } from '@/components/shared/TitleTextarea'
import { PropertyChip } from '@/components/shared/PropertyChip'
import { SegmentedControl } from '@/components/shared/SegmentedControl'
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
import { AiTaskPanel } from '@/features/ai/components/AiTaskPanel'
import { AiDraftNotice } from '@/features/ai/components/AiDraftNotice'
import { useImageHandlers } from '@/features/attachments/api'
import { keepOpenForLightbox } from '@/features/attachments/constants'
import { StagedAttachments } from '@/features/attachments/components/StagedAttachments'
import { TaskAttachments } from '@/features/attachments/components/TaskAttachments'
import { CopyFromJiraButton } from '@/features/jira/components/CopyFromJiraButton'
import { JiraImportNotice } from '@/features/jira/components/JiraImportNotice'
import { JiraImportPanel } from '@/features/jira/components/JiraImportPanel'
import { usePreferences } from '@/features/settings/api'
import { useSpacePaths } from '@/features/spaces/hooks/useSpacePaths'
import { ensureTagIds, useSetTaskTags, useTags } from '@/features/tags/api'
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
  NewTagList,
  TagList,
  TagsChip,
} from '@/features/tasks/components/TaskDialogChips'
import { PriorityMenu, StatusMenu } from '@/features/tasks/components/TaskMenus'
import { VersionsChip } from '@/features/tasks/components/VersionsChip'
import { TASK_PRIORITY_MAP, TASK_STATUS_MAP } from '@/features/tasks/constants'
import { useTaskDialogFiles } from '@/features/tasks/hooks/useTaskDialogFiles'
import { taskSchema } from '@/features/tasks/schemas'
import { textToDoc } from '@/features/tasks/utils'
import { useCreateChecklistItems } from '@/features/todos/api'
import { ChecklistSection } from '@/features/todos/components/ChecklistSection'

/**
 * Create (no `task`) or edit a task (design 04f, Linear-style). Mountable standalone:
 * it only needs SpaceContext. `initialValues` prefills a create; `onSuccess(row)` runs after save.
 * A task's space is fixed at creation (the user's request, 2026-09-25): there is no space picker.
 * The description is the compact rich editor (Feature 06 Phase 3); it still saves with the form
 * (Save / Mod+Enter), not on its own. In edit mode an "Open task" link goes to the detail page
 * (`showOpenLink={false}` when the dialog is opened from that page).
 *
 * Create mode has a Form / Describe with AI / From Jira switch (Feature 17): one AI draft or an
 * imported Jira issue comes back to this form prefilled for review; several AI drafts are reviewed
 * and created in the AI view.
 */
export function TaskDialog({
  open,
  onOpenChange,
  task,
  initialValues,
  onSuccess,
  showOpenLink = true,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-dialog flex-col gap-0 overflow-hidden p-0 sm:max-w-160"
        // An attachment preview (lightbox) opens over the dialog: clicks and Esc there are its own.
        onInteractOutside={keepOpenForLightbox}
        onEscapeKeyDown={keepOpenForLightbox}
      >
        <TaskDialogBody
          task={task}
          initialValues={initialValues}
          onClose={() => onOpenChange(false)}
          onSuccess={onSuccess}
          showOpenLink={showOpenLink}
        />
      </DialogContent>
    </Dialog>
  )
}

const VIEWS = [
  { value: 'form', label: 'Form', icon: PenLine },
  { value: 'ai', label: 'Describe with AI', icon: Sparkles },
  { value: 'jira', label: 'From Jira', icon: Ticket },
]

/**
 * Lives inside DialogContent, so its state resets each time the dialog opens. A prefill (one AI
 * draft, or a Jira issue) remounts the form (`formKey`) with its values and a notice above it.
 */
function TaskDialogBody({ task, initialValues, onClose, onSuccess, showOpenLink }) {
  const [view, setView] = useState('form')
  const [prefill, setPrefill] = useState(null) // { values, notice }
  const [formKey, setFormKey] = useState(0)
  const spaceId = useDefaultSpaceId(initialValues?.space_id)

  if (task) {
    return (
      <TaskForm task={task} onClose={onClose} onSuccess={onSuccess} showOpenLink={showOpenLink} />
    )
  }

  const fill = (values, notice) => {
    setPrefill({ values, notice })
    setFormKey((k) => k + 1)
    setView('form')
  }

  const viewSwitch = (
    <SegmentedControl value={view} onChange={setView} options={VIEWS} label="How to create" />
  )
  if (view === 'ai') {
    return (
      <AiTaskPanel
        spaceId={spaceId}
        headerExtra={viewSwitch}
        onClose={onClose}
        onCreated={(rows) => rows.forEach((row) => onSuccess?.(row))}
        onSingleDraft={(values, info) => fill(values, <AiDraftNotice info={info} />)}
      />
    )
  }
  if (view === 'jira') {
    return (
      <JiraImportPanel
        spaceId={spaceId}
        headerExtra={viewSwitch}
        onClose={onClose}
        onImported={(values, issue) =>
          fill(values, (formApi) => <JiraImportNotice issue={issue} formApi={formApi} />)
        }
      />
    )
  }
  return (
    <TaskForm
      key={formKey}
      initialValues={prefill ? { ...initialValues, ...prefill.values } : initialValues}
      notice={prefill?.notice}
      headerExtra={viewSwitch}
      onClose={onClose}
      onSuccess={onSuccess}
      showOpenLink={showOpenLink}
    />
  )
}

function TaskForm({ task, initialValues, notice, headerExtra, onClose, onSuccess, showOpenLink }) {
  const isEdit = !!task
  const p = useSpacePaths()
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
  const [checklist, setChecklist] = useState(initialValues?.checklist ?? [])
  // Tag names from an AI draft or Jira labels that the space doesn't have yet: created on save.
  const [newTags, setNewTags] = useState(initialValues?.newTags ?? [])
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
  // Files: staged for a new task, description drops, and a Jira import's attachments.
  const { stagedFiles, setStagedFiles, files, afterCreate } = useTaskDialogFiles({
    task,
    jiraAttachments: initialValues?.jira_attachments,
  })

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

  // What a prefill notice may do with the form (the Jira import's "Suggest tags").
  const formApi = {
    spaceId: defaultSpace,
    spaceTags,
    getText: () => ({
      title: form.getValues('title') ?? '',
      description: form.getValues('description_text') ?? '',
    }),
    addTagIds: (ids) => {
      const fresh = ids.filter((id) => !tagIds.includes(id))
      if (fresh.length) setTagIds([...tagIds, ...fresh])
      return fresh.length
    },
  }

  const onSubmit = form.handleSubmit((values) => {
    // An untouched description in edit mode stays out of the patch (undefined isn't sent).
    const payload = isEdit ? values : { ...values, description: values.description ?? null }
    const done = async (row) => {
      let allTagIds = tagIds
      if (!isEdit && newTags.length) {
        try {
          const created = await ensureTagIds({
            spaceId: row.space_id,
            names: newTags,
            tags: spaceTags,
          })
          allTagIds = [...new Set([...tagIds, ...created])]
        } catch (err) {
          toast.error(err.message ?? 'Could not create the new tags')
        }
      }
      setTaskTags.mutate({ taskId: row.id, tagIds: allTagIds })
      if (!isEdit && links.length) createLinks.mutate({ taskId: row.id, links })
      if (!isEdit && checklist.length) {
        createChecklist.mutate({ taskId: row.id, spaceId: row.space_id, titles: checklist })
      }
      if (!isEdit) afterCreate(row)
      onSuccess?.(row)
      if (!isEdit && createMore) {
        toast.success('Task created', { description: row.title })
        form.reset({
          ...values,
          title: '',
          description: null,
          description_text: '',
          jira_key: null,
          jira_imported_at: null,
        })
        setEditorKey((k) => k + 1)
        form.setFocus('title')
        setTagIds([])
        setNewTags([])
        setLinks([])
        setChecklist([])
        setStagedFiles([])
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
        {isEdit && showOpenLink && (
          <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
            <Link to={p.task(task.id)} onClick={onClose}>
              Open task
              <ArrowUpRight />
            </Link>
          </Button>
        )}
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <X />
        </Button>
      </div>
      {headerExtra && <div className="shrink-0 px-5 pt-3">{headerExtra}</div>}

      {/* Only this middle part scrolls; the header and footer stay pinned. */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-3 px-5 pt-4">
          {typeof notice === 'function' ? notice(formApi) : notice}
          <div>
            {/* Versions sit at the far right of the title row, as on the card. */}
            <div className="flex items-start gap-3">
              <Controller
                name="title"
                control={form.control}
                render={({ field }) => (
                  // Wraps onto more lines instead of cutting a long title off (the user's request).
                  <TitleTextarea
                    ref={field.ref}
                    name={field.name}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    label="Task title"
                    placeholder="Task title"
                    aria-invalid={!!errors.title}
                    autoFocus
                    className="min-w-0 flex-1 text-xl leading-snug"
                  />
                )}
              />
              {versions.length > 0 && (
                <div className="mt-1 flex max-w-1/2 shrink-0 flex-wrap justify-end gap-1">
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
                features={{ images, files }}
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
          <NewTagList
            names={newTags}
            onRemove={(name) => setNewTags(newTags.filter((n) => n !== name))}
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
          <ChecklistSection taskId={task.id} spaceId={task.space_id} task={task} />
        ) : (
          <ChecklistSection staged={{ items: checklist, onChange: setChecklist }} />
        )}
        {isEdit ? (
          <TaskAttachments
            task={task}
            actions={<CopyFromJiraButton task={task} />}
            className="border-t px-5 py-4"
          />
        ) : (
          <StagedAttachments
            files={stagedFiles}
            onChange={setStagedFiles}
            className="border-t px-5 py-4"
          />
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
