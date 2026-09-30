import { useCallback, useMemo, useRef, useState } from 'react'
import { Copy, Download, Ellipsis, RotateCw, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { downloadTextFile } from '@/lib/download'
import { formatRelative } from '@/lib/dates'
import { useSpace } from '@/context/SpaceContext'
import { useAutosave } from '@/hooks/useAutosave'
import { useRecordRecent } from '@/hooks/useRecordRecent'
import { useShortcut } from '@/hooks/useShortcut'
import { useShortcutScope } from '@/hooks/useShortcutScope'
import { markdownToDoc, noteToMarkdown } from '@/components/editor/markdown'
import { RichTextEditor } from '@/components/editor/RichTextEditor'
import { usePageHeader } from '@/components/layout/PageHeaderContext'
import { SaveIndicator } from '@/components/shared/SaveIndicator'
import { TitleTextarea } from '@/components/shared/TitleTextarea'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AI_MODEL_MAP } from '@/features/ai/constants'
import { useDeleteReport, useUpdateReport } from '@/features/reports/api'
import { RegenerateReportDialog } from '@/features/reports/components/RegenerateReportDialog'
import { rangeLabel, reportFileName } from '@/features/reports/utils'
import { useSpacePaths } from '@/features/spaces/hooks/useSpacePaths'

const AUTOSAVE_DELAY = 800

/**
 * An editable report (Feature 17 Phase 5), mounted by `ReportPage` with a key that changes on
 * regeneration. A report fresh from the AI has `content` null and its Markdown in `content_text`;
 * it's shown through `markdownToDoc` and saved as Tiptap JSON on the first edit. Title and body
 * autosave; the header has the save state, Copy, Download .md, Regenerate and a ⋯ menu.
 */
export function ReportEditor({ report }) {
  const navigate = useNavigate()
  const p = useSpacePaths()
  const { spaceById } = useSpace()
  const update = useUpdateReport()
  const del = useDeleteReport()
  const [title, setTitle] = useState(report.title)
  useRecordRecent({
    entity_type: 'report',
    id: report.id,
    space_id: report.space_id,
    title: report.title,
    status: report.status,
  })
  const [initialContent] = useState(() => report.content ?? markdownToDoc(report.content_text))
  const [confirmOpen, setConfirmOpen] = useState(false)
  const editorRef = useRef(null)
  const latest = useRef({ title: report.title, content: initialContent })

  const {
    schedule,
    flush,
    status: saveStatus,
  } = useAutosave({
    save: (patch) => update.mutateAsync({ id: report.id, patch }),
    delay: AUTOSAVE_DELAY,
  })
  useShortcutScope('editor')
  useShortcut('editor.save', () => flush())

  const changeTitle = (value) => {
    setTitle(value)
    latest.current = { ...latest.current, title: value }
    if (value.trim()) schedule({ title: value.trim() })
  }

  const changeContent = useCallback(
    (content, content_text) => {
      latest.current = { ...latest.current, content }
      schedule({ content, content_text })
    },
    [schedule],
  )

  const handleReady = useCallback((editor) => {
    editorRef.current = editor
  }, [])

  const markdown = useCallback(
    () =>
      noteToMarkdown({
        title: latest.current.title,
        content: editorRef.current?.getJSON() ?? latest.current.content,
      }),
    [],
  )

  const copy = useCallback(() => {
    navigator.clipboard.writeText(markdown()).then(
      () => toast.success('Copied as Markdown'),
      () => toast.error('Couldn’t copy to the clipboard'),
    )
  }, [markdown])

  const download = useCallback(() => {
    downloadTextFile(reportFileName({ title: latest.current.title }), `${markdown()}\n`)
  }, [markdown])

  const remove = useCallback(() => {
    del.mutate(report, { onSuccess: () => navigate(p.reports()) })
  }, [del, report, navigate, p])

  const headerActions = useMemo(
    () => (
      <>
        <SaveIndicator status={saveStatus} onRetry={flush} className="mr-1" />
        <Button variant="ghost" size="sm" onClick={copy}>
          <Copy />
          Copy
        </Button>
        <Button variant="ghost" size="sm" onClick={download}>
          <Download />
          Download .md
        </Button>
        <Button variant="outline" size="sm" onClick={() => setConfirmOpen(true)}>
          <RotateCw />
          Regenerate
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground"
              aria-label="Report options"
            >
              <Ellipsis />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem variant="destructive" onSelect={remove}>
              <Trash2 />
              Move to Trash
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </>
    ),
    [saveStatus, flush, copy, download, remove],
  )
  usePageHeader({
    title: title.trim() || 'Report',
    actions: headerActions,
    parent: { label: 'Reports', to: p.reports() },
  })

  const space = report.space_id ? spaceById.get(report.space_id) : null
  const modelLabel = AI_MODEL_MAP[report.ai_model]?.label ?? report.ai_model

  return (
    <div className="min-w-0 flex-1 px-4 pt-12 pb-24 md:px-16">
      <div className="mx-auto max-w-190">
        <TitleTextarea
          value={title}
          onChange={changeTitle}
          onEnter={() => editorRef.current?.commands.focus('start')}
          label="Report title"
          className="text-4xl"
        />
        <p className="mt-3 flex flex-wrap gap-x-2 font-mono text-xs text-muted-foreground">
          <span>{rangeLabel(report.period_start, report.period_end)}</span>
          <span className="text-faint">·</span>
          <span>{space ? space.name : 'All spaces'}</span>
          {report.generated_at && (
            <>
              <span className="text-faint">·</span>
              <span>
                Generated {formatRelative(report.generated_at)}
                {modelLabel && ` by ${modelLabel}`}
              </span>
            </>
          )}
        </p>
        <RichTextEditor
          value={initialContent}
          onChange={changeContent}
          onEditorReady={handleReady}
          features={{ slash: true, onSave: flush }}
          placeholder="Type '/' for commands"
          label="Report body"
          className="mt-7 text-base leading-7"
        />
      </div>

      <RegenerateReportDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        report={report}
        beforeRun={flush}
      />
    </div>
  )
}
