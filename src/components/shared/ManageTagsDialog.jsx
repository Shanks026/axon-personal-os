import { useState } from 'react'
import { Tags, Trash2 } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useDeleteTag, useTags, useUpdateTag } from '@/features/tags/api'
import { TAG_COLORS } from '@/features/tags/constants'

const ALL_SPACES = '__all__'

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
        <div role="radiogroup" aria-label="Colour" className="flex flex-wrap gap-1.5">
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

function TagRow({ tag, activeSpaces }) {
  const update = useUpdateTag()
  const del = useDeleteTag()
  const [name, setName] = useState(tag.name)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [scopeWarning, setScopeWarning] = useState(false)

  const saveName = () => {
    const trimmed = name.trim()
    if (trimmed && trimmed !== tag.name) update.mutate({ id: tag.id, patch: { name: trimmed } })
    else setName(tag.name)
  }

  const changeScope = (v) => {
    const space_id = v === ALL_SPACES ? null : v
    setScopeWarning(space_id !== null && tag.count > 0)
    update.mutate({ id: tag.id, patch: { space_id } })
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
        <Select value={tag.space_id ?? ALL_SPACES} onValueChange={changeScope}>
          <SelectTrigger size="sm" className="w-36" aria-label={`Scope of ${tag.name}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_SPACES}>All spaces</SelectItem>
            {activeSpaces.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
      {scopeWarning && (
        <p className="pl-8.5 text-xs text-muted-foreground">
          Items in other spaces keep this tag, but it can’t be added there.
        </p>
      )}

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

/** Rename, recolour, rescope and delete every tag in scope (design: tag management). */
export function ManageTagsDialog({ open, onOpenChange, spaceIds }) {
  const { activeSpaces } = useSpace()
  const { data: tags = [] } = useTags({ spaceIds })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-140">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle>Manage tags</DialogTitle>
          <DialogDescription>Rename, recolour, rescope or delete a tag.</DialogDescription>
        </DialogHeader>
        {tags.length === 0 ? (
          <div className="px-5 pb-5">
            <EmptyState
              icon={Tags}
              title="No tags yet"
              description="Create one from any tag picker."
            />
          </div>
        ) : (
          <div className="max-h-100 overflow-y-auto border-t">
            {tags.map((tag) => (
              <TagRow key={tag.id} tag={tag} activeSpaces={activeSpaces} />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
