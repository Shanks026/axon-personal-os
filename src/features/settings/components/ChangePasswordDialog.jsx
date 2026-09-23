import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FieldGroup } from '@/components/ui/field'
import { useUpdatePassword } from '@/features/auth/api'
import { AuthTextField } from '@/features/auth/components/AuthTextField'
import { FormAlert } from '@/features/auth/components/FormAlert'
import { newPasswordSchema } from '@/features/auth/schemas'
import { mapAuthError } from '@/features/auth/utils'

export function ChangePasswordDialog({ open, onOpenChange }) {
  const update = useUpdatePassword()
  const form = useForm({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { password: '', confirm: '' },
  })

  function handleOpenChange(next) {
    if (!next) form.reset()
    onOpenChange(next)
  }

  const onSubmit = form.handleSubmit(({ password }) =>
    update.mutate(password, {
      onSuccess: () => {
        toast.success('Password updated')
        handleOpenChange(false)
      },
      onError: (err) => {
        const message = mapAuthError(err)
        if (['same_password', 'weak_password'].includes(err.code)) {
          form.setError('password', { message })
        } else {
          form.setError('root', { message })
          toast.error(message)
        }
      },
    }),
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Change password</DialogTitle>
          <DialogDescription>You’ll stay signed in on this device.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={onSubmit}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onSubmit()
          }}
          noValidate
        >
          <FieldGroup className="gap-3.5">
            <AuthTextField
              control={form.control}
              name="password"
              label="New password"
              type="password"
              autoComplete="new-password"
              autoFocus
            />
            <AuthTextField
              control={form.control}
              name="confirm"
              label="Confirm password"
              type="password"
              autoComplete="new-password"
            />
            <FormAlert>{form.formState.errors.root?.message}</FormAlert>
          </FieldGroup>
          <DialogFooter className="mt-5">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? 'Updating…' : 'Update password'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
