import { useMemo } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { formatDate, formatDateShort, formatRelative } from '@/lib/dates'
import { mergeVersions } from '@/lib/versions'
import { cn } from '@/lib/utils'
import { useSpace } from '@/context/SpaceContext'
import { DatePicker } from '@/components/shared/DatePicker'
import { DueLabel } from '@/components/shared/DueLabel'
import { SpaceIcon } from '@/components/shared/SpaceIcon'
import { TagPill } from '@/components/shared/TagPill'
import { TagPicker } from '@/components/shared/TagPicker'
import { VersionBadge } from '@/components/shared/VersionBadge'
import { VersionPicker } from '@/components/shared/VersionPicker'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useNoteVersions } from '@/features/notes/api'
import { usePreferences } from '@/features/settings/api'
import { useSetTaskTags, useTags } from '@/features/tags/api'
import { useQuickUpdateTask, useTaskVersions } from '@/features/tasks/api'
import { PriorityMenu, StatusMenu } from '@/features/tasks/components/TaskMenus'
import { TaskPriorityPill, TaskStatusPill } from '@/features/tasks/components/TaskPills'
import { TaskLinkCards } from '@/features/tasks/components/TaskLinkCards'
import { isClosed } from '@/features/tasks/utils'

/** One label/value row (84px label, design Task Detail rail). */
function Row({ label, children, align = 'center' }) {
  return (
    <div
      className={cn(
        'flex min-h-9 gap-3',
        align === 'start' ? 'items-start py-1.5' : 'items-center',
      )}
    >
      <span className={cn('w-21 shrink-0 text-muted-foreground', align === 'start' && 'pt-0.5')}>
        {label}
      </span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">{children}</div>
    </div>
  )
}

/** A quiet button that looks like the row's value; opens the row's picker. */
function ValueButton({ empty, children, ...props }) {
  return (
    <button
      type="button"
      className={cn(
        '-mx-1.5 flex h-7 items-center rounded-md px-1.5 text-left outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring',
        empty && 'text-faint',
      )}
      {...props}
    >
      {children}
    </button>
  )
}

/** A label on its own line with its badges wrapping below (tags, versions: side by side looked cramped). */
function StackedRow({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5 py-1.5">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex flex-wrap items-center gap-1">{children}</div>
    </div>
  )
}

/** "+ Tag" / "+ Version": the same height and `rounded-sm` as the badges it adds. */
function AddPill({ children, ...props }) {
  return (
    <button
      type="button"
      className="flex h-5 items-center gap-1 rounded-sm border border-dashed border-border-strong px-1.75 text-xs text-faint outline-none hover:border-faint hover:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
      {...props}
    >
      <Plus className="size-3" aria-hidden />
      {children}
    </button>
  )
}

/**
 * The detail page's right rail (design Task Detail): Status, Priority, Start, Due, Space
 * (read-only: a task's space is fixed), Created, Completed, then Tags, Versions and Links, and a
 * footer with the Pinned switch and Move to Trash. Edits save at once (optimistic).
 */
export function TaskMetaRail({ task, onDelete }) {
  const { spaceById } = useSpace()
  const { weekStartsOn } = usePreferences()
  const quick = useQuickUpdateTask()
  const setTags = useSetTaskTags()
  const spaceIds = useMemo(() => [task.space_id], [task.space_id])
  const { data: tags = [] } = useTags({ spaceIds })
  const { data: taskVersions = [] } = useTaskVersions({ spaceIds })
  const { data: noteVersions = [] } = useNoteVersions({ spaceIds })
  const knownVersions = useMemo(
    () => mergeVersions(taskVersions, noteVersions),
    [taskVersions, noteVersions],
  )
  const space = spaceById.get(task.space_id)
  const selectedTags = tags.filter((t) => task.tag_ids?.includes(t.id))
  const versions = task.versions ?? []

  const set = (patch) => quick.mutate({ id: task.id, patch })
  const saveTags = (tagIds) => setTags.mutate({ taskId: task.id, tagIds })

  return (
    <div className="flex flex-col">
      <Row label="Status">
        <StatusMenu value={task.status} onChange={(status) => set({ status })}>
          <TaskStatusPill status={task.status} asButton aria-label="Change status" />
        </StatusMenu>
      </Row>
      <Row label="Priority">
        <PriorityMenu value={task.priority} onChange={(priority) => set({ priority })}>
          <TaskPriorityPill
            priority={task.priority}
            showNone
            asButton
            aria-label="Change priority"
          />
        </PriorityMenu>
      </Row>
      <Row label="Start">
        <DatePicker
          value={task.start_date}
          onChange={(start_date) => set({ start_date })}
          weekStartsOn={weekStartsOn}
        >
          <ValueButton empty={!task.start_date} aria-label="Start date">
            <span className="font-mono text-xs">
              {task.start_date ? formatDateShort(task.start_date) : 'Set date'}
            </span>
          </ValueButton>
        </DatePicker>
      </Row>
      <Row label="Due">
        <DatePicker
          value={task.due_date}
          onChange={(due_date) => set({ due_date })}
          weekStartsOn={weekStartsOn}
        >
          <ValueButton empty={!task.due_date} aria-label="Due date">
            {task.due_date ? (
              <DueLabel date={task.due_date} closed={isClosed(task)} />
            ) : (
              <span className="font-mono text-xs">Set date</span>
            )}
          </ValueButton>
        </DatePicker>
      </Row>
      <Row label="Space">
        <span className="flex min-w-0 items-center gap-1.5">
          <SpaceIcon icon={space?.icon} size="xs" />
          <span className="truncate">{space?.name}</span>
        </span>
      </Row>
      <Row label="Created">
        <span className="font-mono text-xs text-muted-foreground">
          {formatDate(task.created_at)}
        </span>
      </Row>
      <Row label="Completed">
        {task.completed_at ? (
          <span className="font-mono text-xs text-emerald-700 dark:text-emerald-400">
            {formatDate(task.completed_at)}
          </span>
        ) : (
          <span className="text-faint">-</span>
        )}
      </Row>
      <Row label="Updated">
        <span className="font-mono text-xs text-muted-foreground">
          {formatRelative(task.updated_at)}
        </span>
      </Row>

      <div className="my-3 border-t" />

      <StackedRow label="Tags">
        {selectedTags.map((tag) => (
          <TagPill
            key={tag.id}
            tag={tag}
            onRemove={() => saveTags(task.tag_ids.filter((id) => id !== tag.id))}
          />
        ))}
        <TagPicker
          value={task.tag_ids ?? []}
          onChange={saveTags}
          spaceIds={spaceIds}
          createSpaceId={task.space_id}
          trigger={<AddPill>Tag</AddPill>}
        />
      </StackedRow>
      <StackedRow label="Versions">
        {versions.map((v) => (
          <VersionBadge
            key={v}
            version={v}
            onRemove={() => set({ versions: versions.filter((x) => x !== v) })}
          />
        ))}
        <VersionPicker
          value={versions}
          onChange={(next) => set({ versions: next })}
          known={knownVersions}
          trigger={<AddPill>Version</AddPill>}
        />
      </StackedRow>

      <div className="mt-3">
        <p className="mb-1.5 text-muted-foreground">Links</p>
        <TaskLinkCards task={task} />
      </div>

      <div className="my-3 border-t" />

      <label className="flex h-9 cursor-pointer items-center gap-2 text-muted-foreground">
        <span className="flex-1">Pinned</span>
        <Switch
          checked={!!task.pinned_at}
          onCheckedChange={(on) => set({ pinned_at: on ? new Date().toISOString() : null })}
          aria-label="Pinned"
        />
      </label>
      <Button variant="destructive" onClick={onDelete} className="mt-2 justify-start">
        <Trash2 />
        Move to Trash
      </Button>
    </div>
  )
}
