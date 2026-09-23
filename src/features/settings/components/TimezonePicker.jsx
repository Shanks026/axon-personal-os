import { useMemo, useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { formatGmtOffset, listTimeZones } from '@/lib/timezones'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

/** Searchable IANA time zone combobox showing each zone's GMT offset. */
export function TimezonePicker({ id, value, onChange }) {
  const [open, setOpen] = useState(false)
  const zones = useMemo(() => (open ? listTimeZones(new Date(), [value]) : []), [open, value])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-60 justify-between font-normal"
        >
          <span className="truncate">{value}</span>
          <span className="ml-auto flex items-center gap-2">
            <span className="font-mono text-xs text-faint">{formatGmtOffset(value)}</span>
            <ChevronsUpDown className="size-3.5 text-faint" aria-hidden />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="end">
        <Command>
          <CommandInput placeholder="Search time zones…" />
          <CommandList>
            <CommandEmpty>No time zone found.</CommandEmpty>
            <CommandGroup>
              {zones.map((z) => (
                <CommandItem
                  key={z.value}
                  value={`${z.value} ${z.offset}`}
                  onSelect={() => {
                    onChange(z.value)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn('size-3.5', z.value === value ? 'opacity-100' : 'opacity-0')}
                    aria-hidden
                  />
                  <span className="truncate">{z.value.replaceAll('_', ' ')}</span>
                  <span className="ml-auto font-mono text-xs text-faint">{z.offset}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
