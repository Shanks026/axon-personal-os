import { useState } from 'react'
import { ArrowUpRight, Download, Ellipsis, Loader2, Ticket, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatDateShort } from '@/lib/dates'
import { openLink } from '@/lib/download'
import { cn } from '@/lib/utils'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { getDownloadUrl, useDeleteAttachment, useImageUrl } from '@/features/attachments/api'
import { AttachmentIcon } from '@/features/attachments/components/AttachmentIcon'
import { fileExtension, formatBytes, isPreviewable } from '@/features/attachments/utils'

/** The preview area: the image itself (contained, on muted), else a large icon and extension. */
function Preview({ attachment, imageUrl, isImage, busy }) {
  if (busy) {
    return <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden />
  }
  if (isImage) {
    return imageUrl ? (
      <img
        src={imageUrl}
        alt={attachment.name}
        loading="lazy"
        draggable={false}
        className="h-full w-full object-contain"
      />
    ) : (
      <Skeleton className="h-full w-full rounded-none" />
    )
  }
  const ext = fileExtension(attachment.name)
  return (
    <span className="flex flex-col items-center gap-2 text-muted-foreground">
      <AttachmentIcon mime={attachment.mime} name={attachment.name} className="size-8" />
      {ext && <span className="font-mono text-xs uppercase">{ext}</span>}
    </span>
  )
}

/**
 * One file on a task, as a card (the user's request, 2026-09-30: big enough to read, two per
 * row). The preview shows a stored image itself, else a large icon. Clicking an image or a PDF
 * calls `onPreview` (the task's lightbox); other files download under their own name, and a file
 * left in Jira ("In Jira ↗") opens there. Below the preview: the name, "4.2 MB · 30 Sep", a "Jira" label
 * for copied files, Download and ⋯ → Delete (after a confirm). `pending` is an upload placeholder.
 */
export function AttachmentCard({ attachment, pending = false, onPreview }) {
  const del = useDeleteAttachment()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [opening, setOpening] = useState(false)
  const inJira = !attachment.path && !!attachment.external_url
  const isImage = !!attachment.path && String(attachment.mime).startsWith('image/')
  const { data: imageUrl } = useImageUrl(isImage ? attachment.path : null)

  const download = async () => {
    if (pending || opening) return
    setOpening(true)
    try {
      openLink(await getDownloadUrl(attachment), { newTab: inJira })
    } catch (err) {
      toast.error(err.message ?? 'Couldn’t download the file')
    } finally {
      setOpening(false)
    }
  }
  const previewable = !!onPreview && isPreviewable(attachment)
  const openPreview = () => (previewable ? onPreview() : download())

  return (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-lg border bg-card transition-colors duration-(--dur-fast) hover:border-border-strong">
      <button
        type="button"
        onClick={openPreview}
        disabled={pending}
        // Only images and PDFs get their own keyboard stop; for other files the preview repeats the
        // Download button below, so it's for pointer users only.
        aria-label={previewable ? `Preview ${attachment.name}` : undefined}
        aria-hidden={previewable ? undefined : true}
        tabIndex={previewable ? undefined : -1}
        className="flex h-44 items-center justify-center bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default"
      >
        <Preview
          attachment={attachment}
          imageUrl={imageUrl}
          isImage={isImage}
          busy={pending || (opening && !isImage)}
        />
      </button>

      <div className="flex items-center gap-1 border-t py-2 pr-1.5 pl-3">
        <div className="min-w-0 flex-1">
          <p className="truncate" title={attachment.name}>
            {attachment.name}
          </p>
          <p className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground tabular-nums">
            <span className="truncate">
              {pending
                ? 'Uploading…'
                : `${formatBytes(attachment.size)} · ${formatDateShort(attachment.created_at)}`}
            </span>
            {attachment.source === 'jira' && (
              <span className={cn('flex shrink-0 items-center gap-1 font-sans')}>
                <Ticket className="size-3" aria-hidden />
                {inJira ? (
                  <>
                    In Jira
                    <ArrowUpRight className="size-3" aria-hidden />
                  </>
                ) : (
                  'Jira'
                )}
              </span>
            )}
          </p>
        </div>

        {!pending && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground"
                  onClick={download}
                  disabled={opening}
                  aria-label={
                    inJira ? `Open ${attachment.name} in Jira` : `Download ${attachment.name}`
                  }
                >
                  {opening ? (
                    <Loader2 className="animate-spin" />
                  ) : inJira ? (
                    <ArrowUpRight />
                  ) : (
                    <Download />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{inJira ? 'Open in Jira' : 'Download'}</TooltipContent>
            </Tooltip>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-faint"
                  aria-label={`${attachment.name} options`}
                >
                  <Ellipsis />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem variant="destructive" onSelect={() => setConfirmOpen(true)}>
                  <Trash2 />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <ConfirmDialog
              open={confirmOpen}
              onOpenChange={setConfirmOpen}
              title="Delete this file?"
              description={`“${attachment.name}” is removed from Axon for good.`}
              onConfirm={() => {
                setConfirmOpen(false)
                del.mutate(attachment)
              }}
            />
          </>
        )}
      </div>
    </div>
  )
}
