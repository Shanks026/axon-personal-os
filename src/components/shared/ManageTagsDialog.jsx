import { useState } from 'react'
import { Plus, Tags, Trash2 } from 'lucide-react'
import { dotClasses, ringClasses } from '@/lib/tint'
import { cn } from '@/lib/utils'
import { useSpace } from '@/context/SpaceContext'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useCreateTag, useDeleteTag, useTags, useUpdateTag } from '@/features/tags/api'
import { TAG_COLORS } from '@/features/tags/constants'
import { nextTagColor } from '@/features/tags/utils'

/** Colour swatch popover (design: ColorPicker), the same ten hues tags share with spaces. */
function ColorSwatchButton({ color, onChange }) {
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={`Colour: ${color}`}
              className={cn(
                'size-6 shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring',
                dotClasses(color),
              )}
            />
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Colour</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-auto p-2" align="start">
        <div role="radiogroup" aria-label="Colour" className="grid grid-cols-9 gap-1.5">
          {TAG_COLORS.map((key) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={key === color}
              aria-label={key}
              onClick={() => onChange(key)}
              className={cn(
                'size-5.5 rounded-full ring-offset-2 ring-offset-popover outline-none',
                dotClasses(key),
                key === color && cn('ring-2', ringClasses(key)),
              )}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

/**
 * "New tag" row at the top of the dialog. The tag is created in `spaceId` (a space id, or `null`
 * for a tag available everywhere); there is no space picker (the user's request, 2026-09-25).
 */
function NewTagRow({ tags, spaceId }) {
  const create = useCreateTag()
  const [name, setName] = useState('')
  const [color, setColor] = useState(null)
  const shownColor = color ?? nextTagColor(tags)
  const trimmed = name.trim()

  const submit = () => {
    if (!trimmed) return
    create.mutate(
      { name: trimmed, color: shownColor, space_id: spaceId },
      {
        onSuccess: () => {
          setName('')
          setColor(null)
        },
      },
    )
  }

  return (
    <div className="flex items-center gap-2.5 border-b px-3 py-2.5">
      <ColorSwatchButton color={shownColor} onChange={setColor} />
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            submit()
          }
        }}
        placeholder="New tag name"
        aria-label="New tag name"
        maxLength={40}
        className="h-8 flex-1"
      />
      <Button size="sm" onClick={submit} disabled={!trimmed || create.isPending}>
        <Plus />
        Create
      </Button>
    </div>
  )
}

function TagRow({ tag }) {
  const update = useUpdateTag()
  const del = useDeleteTag()
  const [name, setName] = useState(tag.name)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const saveName = () => {
    const trimmed = name.trim()
    if (trimmed && trimmed !== tag.name) update.mutate({ id: tag.id, patch: { name: trimmed } })
    else setName(tag.name)
  }

  return (
    <div className="flex flex-col gap-1 border-b px-3 py-2.5 last:border-0">
      <div className="flex items-center gap-2.5">
        <ColorSwatchButton
          color={tag.color}
          onChange={(color) => update.mutate({ id: tag.id, patch: { color } })}
        />
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={saveName}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          aria-label={`Rename ${tag.name}`}
          className="h-8 flex-1"
        />
        <span className="w-14 shrink-0 text-right font-mono text-xs text-faint">
          {tag.count} {tag.count === 1 ? 'task' : 'tasks'}
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              className="text-faint hover:text-destructive"
              onClick={() => setConfirmOpen(true)}
              aria-label={`Delete ${tag.name}`}
            >
              <Trash2 />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Delete</TooltipContent>
        </Tooltip>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Delete "${tag.name}"?`}
        description={`It will be removed from ${tag.count} ${tag.count === 1 ? 'task' : 'tasks'}.`}
        confirmLabel="Delete"
        pending={del.isPending}
        onConfirm={() => del.mutate(tag.id, { onSuccess: () => setConfirmOpen(false) })}
      />
    </div>
  )
}

/**
 * Create, rename, recolour and delete every tag in scope (design: tag management). New tags go to
 * `createSpaceId` when given (the picker's space), else the current space, or everywhere in Global.
 */
export function ManageTagsDialog({ open, onOpenChange, spaceIds, createSpaceId }) {
  const { space } = useSpace()
  const { data: tags = [] } = useTags({ spaceIds })
  const newTagSpaceId = createSpaceId !== undefined ? createSpaceId : (space?.id ?? null)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-140">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle>Manage tags</DialogTitle>
          <DialogDescription>Create, rename, recolour or delete a tag.</DialogDescription>
        </DialogHeader>
        <div className="border-t">
          <NewTagRow tags={tags} spaceId={newTagSpaceId} />
        </div>
        {tags.length === 0 ? (
          <div className="px-5 py-5">
            <EmptyState icon={Tags} title="No tags yet" description="Create your first one above." />
          </div>
        ) : (
          <div className="max-h-100 overflow-y-auto">
            {tags.map((tag) => (
              <TagRow key={tag.id} tag={tag} />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
