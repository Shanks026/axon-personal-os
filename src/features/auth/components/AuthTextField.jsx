import { Controller } from 'react-hook-form'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/features/auth/components/PasswordInput'

/** One labelled auth input wired to react-hook-form. `aside` renders on the label row (e.g. "Forgot?"). */
export function AuthTextField({
  control,
  name,
  label,
  type = 'text',
  autoComplete,
  placeholder,
  aside,
  autoFocus,
}) {
  const id = `auth-${name}`
  const Comp = type === 'password' ? PasswordInput : Input
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor={id}>{label}</FieldLabel>
            {aside}
          </div>
          <Comp
            id={id}
            {...(type === 'password' ? {} : { type })}
            autoComplete={autoComplete}
            placeholder={placeholder}
            autoFocus={autoFocus}
            aria-invalid={fieldState.invalid}
            className="h-9.5"
            {...field}
          />
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  )
}
