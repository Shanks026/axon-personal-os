import { useCallback, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Ellipsis, PanelRight, Pencil, Trash2 } from 'lucide-react'
import { useHotkeys } from 'react-hotkeys-hook'
import { useLocation, useNavigate } from 'react-router'
import { cn } from '@/lib/utils'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { DetailRail } from '@/components/layout/DetailRail'
import { usePageHeader } from '@/components/layout/PageHeaderContext'
import { SaveIndicator } from '@/components/shared/SaveIndicator'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { LinkedNotesPanel } from '@/features/links/components/LinkedNotesPanel'
import { useSpacePaths } from '@/features/spaces/hooks/useSpacePaths'
import { ActivityTimeline } from '@/features/tasks/components/ActivityTimeline'
import { TaskDescription } from '@/features/tasks/components/TaskDescription'
import { TaskDialog } from '@/features/tasks/components/TaskDialog'
import { TaskMetaRail } from '@/features/tasks/components/TaskMetaRail'
import { TaskTitleInput } from '@/features/tasks/components/TaskTitleInput'
import { useTaskActions } from '@/features/tasks/hooks/useTaskActions'
import { ChecklistSection } from '@/features/todos/components/ChecklistSection'

function HeaderIconButton({ label, shortcut, pressed, disabled, onClick, children }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          aria-pressed={pressed}
          aria-keyshortcuts={shortcut}
          disabled={disabled}
          onClick={onClick}
          className={cn('text-muted-foreground', pressed && 'bg-accent text-foreground')}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{shortcut ? `${label} (${shortcut})` : label}</TooltipContent>
    </Tooltip>
  )
}

/**
 * The task detail page's body (design Task Detail, delta 07), mounted with `key={task.id}`.
 * A 720px main column (title, description, checklist, activity) and a 320px rail (a Sheet below
 * `lg`). It owns the header: the description's save state, previous/next (J/K, following the
 * list order the task was opened from), the Details toggle and a ⋯ menu.
 */
export function TaskDetail({ task }) {
  const navigate = useNavigate()
  const location = useLocation()
  const p = useSpacePaths()
  const actions = useTaskActions()
  const [save, setSave] = useState({ status: 'idle', flush: null })
  const [railOpen, setRailOpen] = useLocalStorage('axon:tasks:rail', true)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  // Previous / next in the list this task was opened from (router state from the Tasks page).
  const order = useMemo(() => location.state?.order ?? [], [location.state])
  const index = order.indexOf(task.id)
  const prevId = index > 0 ? order[index - 1] : null
  const nextId = index >= 0 && index < order.length - 1 ? order[index + 1] : null
  const go = useCallback(
    (id) => id && navigate(p.task(id), { replace: true, state: { order } }),
    [navigate, p, order],
  )
  useHotkeys('k', () => go(prevId), [go, prevId])
  useHotkeys('j', () => go(nextId), [go, nextId])

  const onStatusChange = useCallback((status, flush) => setSave({ status, flush }), [])
  const toggleRail = useCallback(() => {
    if (window.matchMedia('(min-width: 1024px)').matches) setRailOpen((v) => !v)
    else setSheetOpen(true)
  }, [setRailOpen])
  const remove = useCallback(
    () => actions.remove(task, { onDeleted: () => navigate(p.tasks()) }),
    [actions, task, navigate, p],
  )

  const headerActions = useMemo(
    () => (
      <>
        <SaveIndicator status={save.status} onRetry={save.flush ?? undefined} className="mr-1" />
        {order.length > 0 && (
          <>
            <HeaderIconButton
              label="Previous task"
              shortcut="K"
              disabled={!prevId}
              onClick={() => go(prevId)}
            >
              <ChevronUp />
            </HeaderIconButton>
            <HeaderIconButton
              label="Next task"
              shortcut="J"
              disabled={!nextId}
              onClick={() => go(nextId)}
            >
              <ChevronDown />
            </HeaderIconButton>
          </>
        )}
        <HeaderIconButton label="Details" pressed={railOpen} onClick={toggleRail}>
          <PanelRight />
        </HeaderIconButton>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground"
              aria-label="Task options"
            >
              <Ellipsis />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onSelect={() => setEditOpen(true)}>
              <Pencil />
              Edit in dialog
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={remove}>
              <Trash2 />
              Move to Trash
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </>
    ),
    [save, order.length, prevId, nextId, go, railOpen, toggleRail, remove],
  )
  usePageHeader({
    title: task.title,
    actions: headerActions,
    parent: { label: 'Tasks', to: p.tasks() },
  })

  return (
    <div className="flex min-h-full flex-1">
      <div className="min-w-0 flex-1 px-4 pt-10 pb-24 md:px-14">
        <div className="mx-auto flex max-w-180 flex-col gap-8">
          <div className="flex flex-col gap-4">
            <TaskTitleInput task={task} />
            <TaskDescription task={task} onStatusChange={onStatusChange} />
          </div>
          <ChecklistSection taskId={task.id} spaceId={task.space_id} className="border-none p-0" />
          <LinkedNotesPanel task={task} />
          <ActivityTimeline taskId={task.id} />
        </div>
      </div>

      <DetailRail open={railOpen}>
        <TaskMetaRail task={task} onDelete={remove} />
      </DetailRail>
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="overflow-y-auto data-[side=right]:w-80">
          <SheetHeader>
            <SheetTitle>Details</SheetTitle>
            <SheetDescription>Status, dates, tags, versions and links.</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-4">
            <TaskMetaRail task={task} onDelete={remove} />
          </div>
        </SheetContent>
      </Sheet>

      <TaskDialog open={editOpen} onOpenChange={setEditOpen} task={task} showOpenLink={false} />
    </div>
  )
}
