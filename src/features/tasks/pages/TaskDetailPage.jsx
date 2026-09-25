import { Archive, FileQuestion } from 'lucide-react'
import { Link, Navigate, useLocation, useParams } from 'react-router'
import { paths } from '@/lib/paths'
import { useSpace } from '@/context/SpaceContext'
import { usePageHeader } from '@/components/layout/PageHeaderContext'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useSpacePaths } from '@/features/spaces/hooks/useSpacePaths'
import { useTask } from '@/features/tasks/api'
import { TaskDetail } from '@/features/tasks/components/TaskDetail'

/** Header + body for every state other than the loaded task (which sets its own header). */
function TaskStatus({ children }) {
  const p = useSpacePaths()
  usePageHeader({ title: 'Task', parent: { label: 'Tasks', to: p.tasks() } })
  return <div className="mx-auto w-full max-w-180 px-4 pt-10 pb-24">{children}</div>
}

/** /s/:slug/tasks/:taskId (design Task Detail, Feature 07 Phase 1). */
export default function TaskDetailPage() {
  const { taskId } = useParams()
  const location = useLocation()
  const { isGlobal, space, activeSpaces } = useSpace()
  const p = useSpacePaths()
  const { data: task, isLoading, error, refetch } = useTask(taskId)
  const taskSpace = task ? activeSpaces.find((s) => s.id === task.space_id) : null

  if (isLoading) {
    return (
      <TaskStatus>
        <div aria-hidden>
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="mt-6 h-4 w-full" />
          <Skeleton className="mt-3 h-4 w-5/6" />
          <Skeleton className="mt-10 h-5 w-32" />
          <Skeleton className="mt-3 h-4 w-2/3" />
          <Skeleton className="mt-3 h-4 w-1/2" />
        </div>
      </TaskStatus>
    )
  }
  if (error) {
    return (
      <TaskStatus>
        <ErrorState error={error} onRetry={refetch} title="Couldn’t load this task" />
      </TaskStatus>
    )
  }
  if (!task || task.deleted_at) {
    return (
      <TaskStatus>
        <EmptyState
          icon={FileQuestion}
          title="This task doesn’t exist or is in Trash"
          description="It may have been deleted, or the link is wrong."
          action={
            <Button variant="outline" asChild>
              <Link to={p.tasks()}>Back to Tasks</Link>
            </Button>
          }
        />
      </TaskStatus>
    )
  }
  if (!taskSpace) {
    return (
      <TaskStatus>
        <EmptyState
          icon={Archive}
          title="This task is in an archived space"
          description="Restore the space to open its tasks again."
          action={
            <Button variant="outline" asChild>
              <Link to={paths.spaces()}>Go to spaces</Link>
            </Button>
          }
        />
      </TaskStatus>
    )
  }
  // Canonical URL: a task opened under another space moves to its own (Global shows any task).
  if (!isGlobal && task.space_id !== space?.id) {
    return (
      <Navigate to={paths.space(taskSpace.slug).task(task.id)} replace state={location.state} />
    )
  }

  return <TaskDetail key={task.id} task={task} />
}
