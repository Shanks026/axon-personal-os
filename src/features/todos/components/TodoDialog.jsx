import { CalendarDays } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { formatDateShort } from '@/lib/dates'
import { useSpace } from '@/context/SpaceContext'
import { useDefaultSpaceId } from '@/hooks/useDefaultSpaceId'
import { DatePicker } from '@/components/shared/DatePicker'
import { Kbd } from '@/components/shared/Kbd'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { usePreferences } from '@/features/settings/api'
import { useCreateTodo, useUpdateTodo } from '@/features/todos/api'
import { todoSchema } from '@/features/todos/schemas'

/**
 * Create (no `todo`) or edit a todo: the dialog counterpart of the inline add/edit on
 * `TodosPage`, for creating from elsewhere and for a fuller edit. Mountable standalone: it only
 * needs `SpaceContext`. `initialValues` prefills a create; `onSuccess(row)` runs after save.
 */
export function TodoDialog({ open, onOpenChange, todo, initialValues, onSuccess }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-110">
        <TodoForm
          todo={todo}
          initialValues={initialValues}
          onClose={() => onOpenChange(false)}
          onSuccess={onSuccess}
        />
      </DialogContent>
    </Dialog>
  )
}

function TodoForm({ todo, initialValues, onClose, onSuccess }) {
  const isEdit = !!todo
  const { isGlobal, activeSpaces } = useSpace()
  const { weekStartsOn } = usePreferences()
  const create = useCreateTodo()
  const update = useUpdateTodo()
  const defaultSpace = useDefaultSpaceId(initialValues?.space_id ?? todo?.space_id)
  const isChecklistItem = !!(todo?.task_id ?? initialValues?.task_id)
  const pending = create.isPending || update.isPending
  const form = useForm({
    resolver: zodResolver(todoSchema),
    defaultValues: todo
      ? { space_id: todo.space_id, title: todo.title, due_date: todo.due_date }
      : { space_id: defaultSpace, title: '', due_date: null, ...initialValues },
  })

  const onSubmit = form.handleSubmit((values) => {
    const done = (row) => {
      onSuccess?.(row)
      if (!isEdit) toast.success('Todo added')
      onClose()
    }
    if (isEdit) {
      update.mutate(
        { id: todo.id, patch: { title: values.title, due_date: values.due_date } },
        { onSuccess: done },
      )
    } else {
      const { task_id } = initialValues ?? {}
      create.mutate({ ...values, task_id }, { onSuccess: done })
    }
  })

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
        <DialogTitle>{isEdit ? 'Edit todo' : 'New todo'}</DialogTitle>
        <DialogDescription className="sr-only">Title, due date and space.</DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4 px-5.5 py-5">
        <Controller
          name="title"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="todo-title">Title</FieldLabel>
              <Input
                id="todo-title"
                {...field}
                placeholder="Reply to Priya…"
                aria-invalid={fieldState.invalid}
                autoFocus
                autoComplete="off"
                className="h-9"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="due_date"
          control={form.control}
          render={({ field }) => (
            <Field>
              <FieldLabel htmlFor="todo-due">Due</FieldLabel>
              <DatePicker value={field.value} onChange={field.onChange} weekStartsOn={weekStartsOn}>
                <Button
                  id="todo-due"
                  type="button"
                  variant="outline"
                  className="h-9 w-fit justify-start text-muted-foreground data-[has-value=true]:text-foreground"
                  data-has-value={!!field.value}
                >
                  <CalendarDays />
                  {field.value ? formatDateShort(field.value) : 'No due date'}
                </Button>
              </DatePicker>
            </Field>
          )}
        />

        {isGlobal && !isChecklistItem && (
          <Controller
            name="space_id"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="todo-space">Space</FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="todo-space"
                    className="h-9 w-full"
                    aria-invalid={fieldState.invalid}
                  >
                    <SelectValue placeholder="Pick a space" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeSpaces.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <SpaceIcon icon={s.icon} size="xs" />
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        )}
      </div>

      <DialogFooter className="m-0 border-t bg-muted px-5.5 py-3.5">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {isEdit ? 'Save changes' : 'Add todo'}
          <Kbd shortcut="mod+enter" className="text-current opacity-60" />
        </Button>
      </DialogFooter>
    </form>
  )
}
