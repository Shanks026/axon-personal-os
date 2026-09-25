import { useMemo } from 'react'
import { NotebookPen, Pin, SearchX } from 'lucide-react'
import { useSpace } from '@/context/SpaceContext'
import { usePageHeader } from '@/components/layout/PageHeaderContext'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { useNotes } from '@/features/notes/api'
import { NewNoteButton } from '@/features/notes/components/NewNoteButton'
import { NotesGrid } from '@/features/notes/components/NotesGrid'
import { NotesSkeleton } from '@/features/notes/components/NotesSkeleton'
import { NotesTable } from '@/features/notes/components/NotesTable'
import { NotesToolbar } from '@/features/notes/components/NotesToolbar'
import { useNoteActions } from '@/features/notes/hooks/useNoteActions'
import { useNoteFilters } from '@/features/notes/hooks/useNoteFilters'
import { splitPinned } from '@/features/notes/utils'
import { useTags } from '@/features/tags/api'

/** Section label (design 07a): "Pinned" with a pin icon, then "All notes". */
function Section({ title, icon: Icon, children }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {Icon && <Icon className="size-3.25" aria-hidden />}
        {title}
      </h3>
      {children}
    </section>
  )
}

/** Notes (design 07a): newest edit first, a Pinned section when anything is pinned. */
export default function NotesPage() {
  const { space, isGlobal, activeSpaces, scopeSpaceIds } = useSpace()
  const { filters, setFilter } = useNoteFilters()
  const actions = useNoteActions()
  const { data, isLoading, error, refetch } = useNotes({ spaceIds: scopeSpaceIds, q: filters.q })
  const { data: tags = [] } = useTags({ spaceIds: scopeSpaceIds })
  const tagsById = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags])

  const notes = useMemo(() => data ?? [], [data])
  const { pinned, rest } = useMemo(() => splitPinned(notes), [notes])
  usePageHeader({ title: 'Notes' })

  const subtitle = isGlobal
    ? `Everything across ${activeSpaces.map((s) => s.name).join(', ')}`
    : 'Meeting notes, investigations, snippets and how-tos.'
  const View = filters.view === 'table' ? NotesTable : NotesGrid

  return (
    <div className="flex w-full flex-col px-4 pt-8 pb-12 md:px-9">
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-3">
            <h2 className="text-3xl font-semibold tracking-tight">Notes</h2>
            <span className="text-2xl font-light text-faint tabular-nums">{notes.length}</span>
          </div>
          <p className="mt-1.5 truncate text-muted-foreground">
            {isGlobal ? subtitle : space?.description || subtitle}
          </p>
        </div>
        <NewNoteButton />
      </div>

      <div className="mt-6">
        <NotesToolbar filters={filters} setFilter={setFilter} />
      </div>

      <div className="mt-6">
        {isLoading ? (
          <NotesSkeleton view={filters.view} />
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} title="Couldn’t load notes" />
        ) : notes.length === 0 ? (
          filters.q ? (
            <EmptyState
              icon={SearchX}
              title={`No notes match “${filters.q}”`}
              description="Try a different word, or clear the search."
            />
          ) : (
            <EmptyState
              icon={NotebookPen}
              title="No notes yet"
              description="Capture meeting notes, ideas and how-tos."
              action={<NewNoteButton />}
            />
          )
        ) : (
          <div className="flex flex-col gap-8">
            {pinned.length > 0 && (
              <Section title="Pinned" icon={Pin}>
                <View notes={pinned} tagsById={tagsById} actions={actions} />
              </Section>
            )}
            {rest.length > 0 && (
              <Section title="All notes">
                <View notes={rest} tagsById={tagsById} actions={actions} />
              </Section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
