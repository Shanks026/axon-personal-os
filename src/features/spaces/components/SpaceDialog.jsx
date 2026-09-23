import { useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Pencil } from 'lucide-react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { positionAfterLast } from '@/lib/position'
import { SpaceIcon } from '@/components/shared/SpaceIcon'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  isDuplicateSlugError,
  useCreateSpace,
  useSpaces,
  useUpdateSpace,
} from '@/features/spaces/api'
import { ColorPicker } from '@/features/spaces/components/ColorPicker'
import { IconPicker } from '@/features/spaces/components/IconPicker'
import { DEFAULT_SPACE_COLOR, DEFAULT_SPACE_ICON } from '@/features/spaces/constants'
import { spaceSchema } from '@/features/spaces/schemas'
import { slugify, uniqueSlug } from '@/features/spaces/utils'

const EMPTY = {
  name: '',
  slug: '',
  description: '',
  color: DEFAULT_SPACE_COLOR,
  icon: DEFAULT_SPACE_ICON,
}

const toValues = (space) =>
  space
    ? {
        name: space.name,
        slug: space.slug,
        description: space.description ?? '',
        color: space.color,
        icon: space.icon,
      }
    : EMPTY

/**
 * Create (no `space`) or edit a space (design 02c). The slug follows the name until the user
 * edits it by hand. Mountable standalone; `onSuccess(row)` fires after the dialog closes.
 * The form lives in DialogContent, which unmounts on close, so every open starts fresh.
 */
export function SpaceDialog({ open, onOpenChange, space, onSuccess }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-130">
        <SpaceForm space={space} onClose={() => onOpenChange(false)} onSuccess={onSuccess} />
      </DialogContent>
    </Dialog>
  )
}

function SpaceForm({ space, onClose, onSuccess }) {
  const isEdit = !!space
  const { data: spaces = [] } = useSpaces()
  const create = useCreateSpace()
  const update = useUpdateSpace()
  const pending = create.isPending || update.isPending

  const otherSlugs = useMemo(
    () => spaces.filter((s) => s.id !== space?.id).map((s) => s.slug),
    [spaces, space?.id],
  )

  const form = useForm({ resolver: zodResolver(spaceSchema), defaultValues: toValues(space) })
  const [slugTouched, setSlugTouched] = useState(isEdit)
  const [editingSlug, setEditingSlug] = useState(false)

  const [color, icon, slug] = useWatch({ control: form.control, name: ['color', 'icon', 'slug'] })

  function handleNameChange(name, onChange) {
    onChange(name)
    if (!slugTouched) {
      form.setValue('slug', name.trim() ? uniqueSlug(slugify(name), otherSlugs) : '', {
        shouldValidate: form.formState.isSubmitted,
      })
    }
  }

  function handleSuccess(row) {
    toast.success(isEdit ? 'Space updated' : `${row.name} created`)
    onClose()
    onSuccess?.(row)
  }

  function handleError(err) {
    if (isDuplicateSlugError(err)) {
      setEditingSlug(true)
      form.setError('slug', { message: 'You already have a space at this URL' })
    }
  }

  const onSubmit = form.handleSubmit((values) => {
    if (otherSlugs.includes(values.slug)) {
      handleError({ code: '23505', message: 'slug' })
      return
    }
    const payload = { ...values, description: values.description || null }
    if (isEdit) {
      update.mutate(
        { id: space.id, patch: payload },
        { onSuccess: handleSuccess, onError: handleError },
      )
    } else {
      create.mutate(
        { ...payload, position: positionAfterLast(spaces.map((s) => s.position)) },
        { onSuccess: handleSuccess, onError: handleError },
      )
    }
  })

  const slugError = form.formState.errors.slug

  return (
    <form
      onSubmit={onSubmit}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault()
          onSubmit()
        }
      }}
      noValidate
    >
      <DialogHeader className="border-b px-5.5 py-4.5">
        <DialogTitle>{isEdit ? 'Edit space' : 'New space'}</DialogTitle>
        <DialogDescription className="sr-only">
          Name, URL, colour and icon for this space.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4 px-5.5 py-5">
        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <div className="flex items-end gap-3">
                <SpaceIcon icon={icon} color={color} size="lg" />
                <div className="flex flex-1 flex-col gap-1.5">
                  <FieldLabel htmlFor="space-name">Name</FieldLabel>
                  <Input
                    id="space-name"
                    {...field}
                    onChange={(e) => handleNameChange(e.target.value, field.onChange)}
                    placeholder="THMP, Personal, Learning…"
                    aria-invalid={fieldState.invalid}
                    autoFocus
                    autoComplete="off"
                    className="h-9"
                  />
                </div>
              </div>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
            <span className="text-faint">axon.app/s/</span>
            {editingSlug ? (
              <Controller
                name="slug"
                control={form.control}
                render={({ field }) => (
                  <Input
                    {...field}
                    onChange={(e) => {
                      setSlugTouched(true)
                      field.onChange(e.target.value.toLowerCase())
                    }}
                    onBlur={() => {
                      field.onBlur()
                      if (!slugError) setEditingSlug(false)
                    }}
                    aria-label="URL name"
                    aria-invalid={!!slugError}
                    autoFocus
                    className="h-6 w-48 px-1.5 font-mono text-xs"
                  />
                )}
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingSlug(true)}
                className="flex items-center gap-2 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Edit URL name"
              >
                <span className="flex h-6 items-center rounded-sm bg-muted px-1.5 text-foreground">
                  {slug || 'your-space'}
                </span>
                <Pencil className="size-3 text-faint" aria-hidden />
              </button>
            )}
          </div>
          {slugError && <FieldError errors={[slugError]} />}
        </div>

        <Controller
          name="description"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="space-description">Description</FieldLabel>
              <Input
                id="space-description"
                {...field}
                placeholder="What lives here?"
                aria-invalid={fieldState.invalid}
                className="h-9"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <div className="flex flex-col gap-2">
          <span className="font-medium">Colour</span>
          <Controller
            name="color"
            control={form.control}
            render={({ field }) => <ColorPicker value={field.value} onChange={field.onChange} />}
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="font-medium">Icon</span>
          <Controller
            name="icon"
            control={form.control}
            render={({ field }) => (
              <IconPicker value={field.value} onChange={field.onChange} color={color} />
            )}
          />
        </div>
      </div>

      <DialogFooter className="m-0 border-t bg-muted px-5.5 py-3.5">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {isEdit ? 'Save changes' : 'Create space'}
          <kbd className="font-mono text-xs opacity-60">⌘↵</kbd>
        </Button>
      </DialogFooter>
    </form>
  )
}
