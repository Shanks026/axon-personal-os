import { useState } from 'react'
import { format } from 'date-fns'
import { RotateCw } from 'lucide-react'
import { isRouteErrorResponse, useRouteError } from 'react-router'
import { ErrorPage } from '@/components/shared/ErrorPage'
import { Button } from '@/components/ui/button'
import NotFoundPage from '@/features/system/pages/NotFoundPage'

const makeRef = () => crypto.randomUUID().replaceAll('-', '').slice(0, 8)

/** errorElement for every route: 404 responses reuse NotFoundPage, anything else is a 500. */
export default function RouteErrorPage() {
  const error = useRouteError()
  const [ref] = useState(makeRef)

  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />

  if (import.meta.env.DEV) console.error(error)

  const trace = `ref ${ref.slice(0, 4)}-${ref.slice(4)} · ${format(new Date(), 'd MMM yyyy HH:mm')}`

  return (
    <ErrorPage
      code="500"
      title="Something broke on our side"
      description="Your data is safe. Try again. If it keeps happening, the reference below helps."
      trace={trace}
      actions={
        <Button size="lg" onClick={() => window.location.reload()}>
          <RotateCw />
          Try again
        </Button>
      }
    />
  )
}
