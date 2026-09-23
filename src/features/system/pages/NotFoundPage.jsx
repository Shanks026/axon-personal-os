import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'
import { ErrorPage } from '@/components/shared/ErrorPage'
import { Button } from '@/components/ui/button'
import { paths } from '@/lib/paths'

export default function NotFoundPage() {
  return (
    <ErrorPage
      code="404"
      title="Nothing here"
      description="This page was moved, deleted, or never existed. If it was a task or note, check Trash."
      actions={
        <Button asChild size="lg">
          <Link to={paths.home()}>
            <ArrowLeft />
            Back to dashboard
          </Link>
        </Button>
      }
    />
  )
}
