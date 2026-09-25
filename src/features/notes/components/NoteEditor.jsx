import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PanelRight, Pin, PinOff } from 'lucide-react'
import { useNavigate } from 'react-router'
import { cn } from '@/lib/utils'
import { useSpace } from '@/context/SpaceContext'
import { useAutosave } from '@/hooks/useAutosave'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { RichTextEditor } from '@/components/editor/RichTextEditor'
import { usePageHeader } from '@/components/layout/PageHeaderContext'
import { SaveIndicator } from '@/components/shared/SaveIndicator'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useDiscardNote, useUpdateNote } from '@/features/notes/api'
import { NoteActionsMenu } from '@/features/notes/components/NoteActionsMenu'
import { NoteMetaRail } from '@/features/notes/components/NoteMetaRail'
import { NoteTagsRow } from '@/features/notes/components/NoteTagsRow'
import { NoteTitleInput } from '@/features/notes/components/NoteTitleInput'
import { NOTE_AUTOSAVE_DELAY } from '@/features/notes/constants'
import { useNoteActions } from '@/features/notes/hooks/useNoteActions'
import { useSpacePaths } from '@/features/spaces/hooks/useSpacePaths'
import { countWords, isNoteEmpty } from '@/features/notes/utils'

function HeaderIconButton({ label, pressed, onClick, children }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          aria-pressed={pressed}
          onClick={onClick}
          className={cn('text-muted-foreground', pressed && 'bg-accent text-foreground')}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

/**
 * The note editor (design 07b), mounted with `key={note.id}` by `NoteEditorPage` once the note
 * has loaded. It owns the header (save state, pin, rail toggle, ⋮), so it calls `usePageHeader`
 * itself. Title and body autosave (800ms) through `useAutosave`; the latest local values live in
 * a ref. A note left completely empty is hard-deleted on leave (after any pending save).
 */
export function NoteEditor({ note }) {
  const navigate = useNavigate()
  const p = useSpacePaths()
  const { spaceById } = useSpace()
  const update = useUpdateNote()
  const { mutate: discard } = useDiscardNote()
  const actions = useNoteActions()
  const [title, setTitle] = useState(note.title)
  const [text, setText] = useState(note.content_text)
  const [railOpen, setRailOpen] = useLocalStorage('axon:notes:rail', true)
  const [sheetOpen, setSheetOpen] = useState(false)
  const editorRef = useRef(null)
  const latest = useRef({
    title: note.title,
    content_text: note.content_text,
    content: note.content,
  })
  const deletedRef = useRef(false)
  // Tags and versions save on their own (not through autosave); keep them for the leave check.
  useEffect(() => {
    latest.current = { ...latest.current, tag_ids: note.tag_ids, versions: note.versions }
  }, [note.tag_ids, note.versions])
  const mountedRef = useRef(false)

  const { schedule, flush, status } = useAutosave({
    save: (patch) => update.mutateAsync({ id: note.id, patch }),
    delay: NOTE_AUTOSAVE_DELAY,
  })

  // Discard on leave. Cleanup defers the check a tick and skips it if the component came back:
  // React StrictMode unmounts and remounts once in dev, which must not delete the note.
  const flushRef = useRef(flush)
  useEffect(() => {
    flushRef.current = flush
  }, [flush])
  useEffect(() => {
    mountedRef.current = true
    const id = note.id
    return () => {
      mountedRef.current = false
      const saved = flushRef.current()
      setTimeout(() => {
        if (mountedRef.current || deletedRef.current || !isNoteEmpty(latest.current)) return
        saved.finally(() => discard(id))
      }, 0)
    }
  }, [note.id, discard])

  const changeTitle = (value) => {
    setTitle(value)
    latest.current = { ...latest.current, title: value }
    schedule({ title: value })
  }

  const changeContent = useCallback(
    (content, content_text) => {
      latest.current = { ...latest.current, content, content_text }
      setText(content_text)
      schedule({ content, content_text })
    },
    [schedule],
  )

  const handleReady = useCallback((editor) => {
    editorRef.current = editor
  }, [])

  const toggleRail = useCallback(() => {
    if (window.matchMedia('(min-width: 1024px)').matches) setRailOpen((v) => !v)
    else setSheetOpen(true)
  }, [setRailOpen])

  const remove = useCallback(() => {
    deletedRef.current = true
    actions.remove(note, { onDeleted: () => navigate(p.notes()) })
  }, [actions, note, navigate, p])

  const pinned = !!note.pinned_at
  const headerActions = useMemo(
    () => (
      <>
        <SaveIndicator status={status} onRetry={flush} className="mr-1" />
        <HeaderIconButton
          label={pinned ? 'Unpin' : 'Pin'}
          pressed={pinned}
          onClick={() => actions.togglePin(note)}
        >
          {pinned ? <PinOff /> : <Pin />}
        </HeaderIconButton>
        <HeaderIconButton label="Details" pressed={railOpen} onClick={toggleRail}>
          <PanelRight />
        </HeaderIconButton>
        <NoteActionsMenu note={note} showPin={false} vertical={false} onDelete={remove} />
      </>
    ),
    [status, flush, pinned, actions, note, railOpen, toggleRail, remove],
  )
  usePageHeader({
    title: title.trim() || 'Untitled',
    actions: headerActions,
    parent: { label: 'Notes', to: p.notes() },
  })

  const space = spaceById.get(note.space_id)
  const words = countWords(text)

  return (
    <div className="flex min-h-full flex-1">
      <div className="min-w-0 flex-1 px-4 pt-12 pb-24 md:px-16">
        <div className="mx-auto max-w-170">
          <NoteTitleInput
            value={title}
            onChange={changeTitle}
            onEnter={() => editorRef.current?.commands.focus('start')}
            autoFocus={!note.title && !note.content_text}
          />
          <NoteTagsRow note={note} />
          <RichTextEditor
            value={note.content}
            onChange={changeContent}
            onEditorReady={handleReady}
            label="Note body"
            className="mt-7 text-base leading-7"
          />
        </div>
      </div>

      {railOpen && (
        <aside className="hidden w-70 shrink-0 border-l p-5 lg:block">
          <NoteMetaRail note={note} space={space} words={words} className="sticky top-5" />
        </aside>
      )}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="data-[side=right]:w-70">
          <SheetHeader>
            <SheetTitle>Details</SheetTitle>
            <SheetDescription>About this note.</SheetDescription>
          </SheetHeader>
          <NoteMetaRail note={note} space={space} words={words} className="px-4" />
        </SheetContent>
      </Sheet>
    </div>
  )
}
