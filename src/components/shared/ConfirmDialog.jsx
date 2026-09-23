import { useId, useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

/**
 * Confirmation for permanent actions. With `requireText`, the confirm button stays disabled
 * until the typed value matches exactly. The dialog stays open until the parent closes it,
 * so `pending` can show progress.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  confirmLabel = 'Delete',
  destructive = true,
  requireText,
  onConfirm,
  pending = false,
}) {
  const inputId = useId()
  const [typed, setTyped] = useState('')
  const blocked = !!requireText && typed !== requireText

  function handleOpenChange(next) {
    if (!next) setTyped('')
    onOpenChange?.(next)
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        {children}
        {requireText && (
          <div className="grid gap-1.5">
            <Label htmlFor={inputId} className="text-small text-muted-foreground">
              Type <span className="font-mono text-foreground">{requireText}</span> to confirm
            </Label>
            <Input
              id={inputId}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              autoFocus
            />
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={blocked || pending}
            className={cn(destructive && 'bg-destructive text-white hover:bg-destructive/90')}
            onClick={(e) => {
              e.preventDefault()
              onConfirm?.()
            }}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
