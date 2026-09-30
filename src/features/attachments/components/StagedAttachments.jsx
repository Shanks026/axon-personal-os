import { useRef, useState } from 'react'
import { Paperclip, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { AttachmentIcon } from '@/features/attachments/components/AttachmentIcon'
import { useAcceptFiles } from '@/features/attachments/hooks/useAcceptFiles'
import { formatBytes } from '@/features/attachments/utils'

const hasFiles = (e) => Array.from(e.dataTransfer?.types ?? []).includes('Files')

/**
 * The new-task dialog's Attachments: files are held here (`files`, `onChange`) and uploaded once
 * the task is saved, like the staged checklist. Attach files, or drop them on the section.
 * @param {{ files: File[], onChange: (files: File[]) => void, className?: string }} props
 */
export function StagedAttachments({ files, onChange, className }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const accept = useAcceptFiles()
  const add = (list) => {
    const ok = accept(list)
    if (ok.length) onChange([...files, ...ok])
  }

  return (
    <section
      aria-label="Attachments"
      className={cn(
        'outline-offset-4',
        dragging && 'rounded-lg outline-2 outline-border-strong outline-dashed',
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
        add(e.dataTransfer.files)
      }}
    >
      <div className="flex items-center gap-2">
        <h3 className="font-medium">Attachments</h3>
        {files.length > 0 ? (
          <span className="text-muted-foreground tabular-nums">{files.length}</span>
        ) : (
          <span className="text-muted-foreground">· uploads when you save</span>
        )}
        <div className="flex-1" />
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
            add(e.target.files)
            e.target.value = ''
          }}
        />
      </div>
      {files.length > 0 && (
        <ul className="mt-1.5 flex flex-col">
          {files.map((file, i) => (
            <li
              key={`${file.name}-${file.size}-${file.lastModified}-${i}`}
              className="flex h-10 items-center gap-2.5 rounded-md px-2 hover:bg-accent"
            >
              <span className="flex size-7 shrink-0 items-center justify-center">
                <AttachmentIcon mime={file.type} name={file.name} />
              </span>
              <span className="min-w-0 flex-1 truncate" title={file.name}>
                {file.name}
              </span>
              <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                {formatBytes(file.size)}
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="text-faint"
                    onClick={() => onChange(files.filter((_, j) => j !== i))}
                    aria-label={`Remove ${file.name}`}
                  >
                    <X />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Remove</TooltipContent>
              </Tooltip>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
