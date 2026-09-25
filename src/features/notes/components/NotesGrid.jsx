import { AnimatePresence, motion } from 'motion/react'
import { useSpace } from '@/context/SpaceContext'
import { listItem, springs } from '@/components/motion/presets'
import { NoteCard } from '@/features/notes/components/NoteCard'
import { useSpacePaths } from '@/features/spaces/hooks/useSpacePaths'

/** 3-column card grid (design 07a). Cards animate in and out and reflow with `layout`. */
export function NotesGrid({ notes, tagsById, actions }) {
  const { isGlobal, spaceById } = useSpace()
  const p = useSpacePaths()
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      <AnimatePresence initial={false}>
        {notes.map((note) => (
          <motion.div
            key={note.id}
            layout
            variants={listItem}
            initial="initial"
            animate="animate"
            exit={{ opacity: 0, scale: 0.98 }}
            transition={springs.snappy}
          >
            <NoteCard
              note={note}
              to={p.note(note.id)}
              space={spaceById.get(note.space_id)}
              showSpace={isGlobal}
              tags={note.tag_ids.map((id) => tagsById.get(id)).filter(Boolean)}
              onTogglePin={actions.togglePin}
              onDelete={actions.remove}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
