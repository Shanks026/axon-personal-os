import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group'

/**
 * Password field on shadcn's InputGroup with a show/hide button. Masked by default.
 * `type` is always set after the props spread, so callers (or RHF) can never unmask it by
 * passing `type`. That was the old bug: an undefined `type` overrode "password".
 * `className` styles the group (height, width); every other prop goes to the input.
 */
export function PasswordInput({ className, type: _ignored, ...props }) {
  const [visible, setVisible] = useState(false)
  const Icon = visible ? EyeOff : Eye
  return (
    <InputGroup className={className}>
      <InputGroupInput {...props} type={visible ? 'text' : 'password'} />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          size="icon-xs"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          className="text-faint hover:text-foreground"
        >
          <Icon />
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  )
}
