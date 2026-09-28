import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AI_MODELS } from '@/features/ai/constants'

/**
 * Choose a Claude model (the allowlist in `AI_MODELS`): the label in the trigger, the label and a
 * price hint in the list. Used in the composer and in Settings → AI & integrations.
 */
export function ModelPicker({
  value,
  onChange,
  size = 'sm',
  label = 'Model',
  className,
  disabled,
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger
        size={size}
        aria-label={label}
        className={cn('text-muted-foreground', className)}
      >
        <Sparkles className="size-3.5" aria-hidden />
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end" position="popper">
        {AI_MODELS.map((m) => (
          <SelectItem key={m.id} value={m.id} textValue={m.label}>
            <span className="flex flex-col">
              <span>{m.label}</span>
              <span className="text-xs text-muted-foreground">{m.hint}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
