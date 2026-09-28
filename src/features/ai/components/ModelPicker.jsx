import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAiStatus } from '@/features/ai/api'
import { AI_MODEL_MAP, AI_MODELS, AI_PROVIDERS } from '@/features/ai/constants'
import { availableModels } from '@/features/ai/utils'

const GROUPS = Object.entries(AI_PROVIDERS).map(([id, p]) => ({
  id,
  label: p.label,
  models: AI_MODELS.filter((m) => m.provider === id),
}))

/**
 * Choose a model, grouped by provider. Models whose provider has no key yet (Claude, for now) are
 * listed but disabled, with "Needs an API key". Used in the composer and in Settings.
 */
export function ModelPicker({
  value,
  onChange,
  size = 'sm',
  label = 'Model',
  className,
  disabled,
}) {
  const { data: status } = useAiStatus()
  const available = availableModels(status)

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger
        size={size}
        aria-label={label}
        className={cn('text-muted-foreground', className)}
      >
        <Sparkles className="size-3.5" aria-hidden />
        {/* Only the name in the trigger: the list items also carry a hint line. */}
        <SelectValue>{AI_MODEL_MAP[value]?.label}</SelectValue>
      </SelectTrigger>
      <SelectContent align="end" position="popper">
        {GROUPS.map((g) => (
          <SelectGroup key={g.id}>
            <SelectLabel className="text-xs text-faint">{g.label}</SelectLabel>
            {g.models.map((m) => {
              const off = available ? !available.has(m.id) : false
              return (
                <SelectItem key={m.id} value={m.id} textValue={m.label} disabled={off}>
                  <span className="flex flex-col">
                    <span>{m.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {off ? 'Needs an API key' : m.hint}
                    </span>
                  </span>
                </SelectItem>
              )
            })}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  )
}
