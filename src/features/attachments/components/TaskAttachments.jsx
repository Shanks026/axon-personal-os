import { useMemo, useRef, useState } from 'react'
import { Paperclip } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '@/lib/utils'
import { listItem } from '@/components/motion/presets'
import { ErrorState } from '@/components/shared/ErrorState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useTaskAttachments, useUploadAttachments } from '@/features/attachments/api'
import { AttachmentCard } from '@/features/attachments/components/AttachmentCard'
import { AttachmentLightbox } from '@/features/attachments/components/AttachmentLightbox'
import { isPreviewable } from '@/features/attachments/utils'

const hasFiles = (e) => Array.from(e.dataTransfer?.types ?? []).includes('Files')

/**
 * A task's "Attachments" section (Feature 15 Phase 2): the files, oldest first, and "Attach
 * files" (or drop files anywhere on the section), as cards two to a row. Images and PDFs open in
 * the preview lightbox. Each upload shows as a placeholder card until it's stored. `className` restyles the frame (the dialog adds its border and padding);
 * `actions` go in the header before Attach files (a Jira task's "Copy from Jira").
 * @param {{ task: { id: string, space_id: string }, actions?: React.ReactNode, className?: string }} props
 */
export function TaskAttachments({ task, actions, className }) {
  const { data: files = [], isLoading, error, refetch } = useTaskAttachments(task.id)
  const upload = useUploadAttachments()
  const inputRef = useRef(null)
  const [pending, setPending] = useState([]) // [{ key, file }]
  const [dragging, setDragging] = useState(false)
  // The lightbox shows the task's images and PDFs; -1 = closed.
  const previewable = useMemo(() => files.filter(isPreviewable), [files])
  const [previewIndex, setPreviewIndex] = useState(-1)

  const attach = (list) => {
    const chosen = Array.from(list ?? [])
    if (!chosen.length) return
    const rows = chosen.map((file) => ({ key: crypto.randomUUID(), file }))
    setPending((p) => [...p, ...rows])
    upload.mutate({
      task,
      files: chosen,
      onFileSettled: (file) => setPending((p) => p.filter((r) => r.file !== file)),
    })
  }

  const count = files.length

  return (
    <section
      aria-label="Attachments"
      className={cn(
        'rounded-lg outline-offset-4',
        dragging && 'outline-2 outline-border-strong outline-dashed',
        className,
      )}
      onDragOver={(e) => {
        if (!hasFiles(e)) return
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false)
      }}
      onDrop={(e) => {
        if (!hasFiles(e)) return
        e.preventDefault()
        setDragging(false)
        attach(e.dataTransfer.files)
      }}
    >
      <div className="flex items-center gap-2">
        <h3 className="font-medium">Attachments</h3>
        {count > 0 && <span className="text-muted-foreground tabular-nums">{count}</span>}
        <div className="flex-1" />
        {actions}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => inputRef.current?.click()}
        >
          <Paperclip />
          Attach files
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            attach(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      <div className="mt-2">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" aria-hidden>
            <Skeleton className="h-60 rounded-lg" />
            <Skeleton className="h-60 rounded-lg" />
          </div>
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} title="Couldn’t load the files" />
        ) : count === 0 && pending.length === 0 ? (
          <p className="py-1.5 text-faint">Drop files here or attach them.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <AnimatePresence initial={false}>
              {files.map((a) => (
                <motion.li
                  key={a.id}
                  layout
                  variants={listItem}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                >
                  <AttachmentCard
                    attachment={a}
                    onPreview={() => setPreviewIndex(previewable.indexOf(a))}
                  />
                </motion.li>
              ))}
              {pending.map(({ key, file }) => (
                <motion.li
                  key={key}
                  layout
                  variants={listItem}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                >
                  <AttachmentCard
                    pending
                    attachment={{ name: file.name, mime: file.type, size: file.size }}
                  />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
      <AttachmentLightbox
        files={previewable}
        index={previewIndex}
        onIndexChange={setPreviewIndex}
        onClose={() => setPreviewIndex(-1)}
      />
    </section>
  )
}
