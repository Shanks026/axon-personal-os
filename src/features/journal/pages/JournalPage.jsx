import { useCallback, useMemo, useState } from 'react'
import { PanelRight } from 'lucide-react'
import { useHotkeys } from 'react-hotkeys-hook'
import { Navigate } from 'react-router'
import { cn } from '@/lib/utils'
import { useSpace } from '@/context/SpaceContext'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { DetailRail } from '@/components/layout/DetailRail'
import { usePageHeader } from '@/components/layout/PageHeaderContext'
import { SaveIndicator } from '@/components/shared/SaveIndicator'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useSpacePaths } from '@/features/spaces/hooks/useSpacePaths'
import { usePreferences } from '@/features/settings/api'
import { useClearJournalEntry, useJournalEntry } from '@/features/journal/api'
import { DateStrip } from '@/features/journal/components/DateStrip'
import { DoneThatDay } from '@/features/journal/components/DoneThatDay'
import { JournalDateHeading } from '@/features/journal/components/JournalDateHeading'
import { JournalEditor } from '@/features/journal/components/JournalEditor'
import { JournalEntryMenu } from '@/features/journal/components/JournalEntryMenu'
import { JournalGlobalDay } from '@/features/journal/components/JournalGlobalDay'
import { useJournalDate } from '@/features/journal/hooks/useJournalDate'

const IDLE = { status: 'idle', flush: () => Promise.resolve() }

/** /s/:slug/journal and /s/:slug/journal/:date (design Journal.dc). */
export default function JournalPage() {
  const p = useSpacePaths()
  const { isGlobal, space, scopeSpaceIds } = useSpace()
  const { weekStartsOn } = usePreferences()
  const { date, today, isToday, invalid, goTo, goPrev, goNext, goToday } = useJournalDate()
  const [railOpen, setRailOpen] = useLocalStorage('axon:journal:rail', true)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [save, setSave] = useState(IDLE)
  const [resetKey, setResetKey] = useState(0)

  const { data: entry } = useJournalEntry({ spaceId: isGlobal ? null : space?.id, date })
  const clear = useClearJournalEntry({ onReset: () => setResetKey((k) => k + 1) })
  const { flush } = save
  const clearEntry = useCallback(async () => {
    await flush()
    if (entry) clear.mutate(entry)
  }, [flush, entry, clear])

  const toggleRail = useCallback(() => {
    if (window.matchMedia('(min-width: 1024px)').matches) setRailOpen((v) => !v)
    else setSheetOpen(true)
  }, [setRailOpen])

  useHotkeys('alt+left', goPrev, { preventDefault: true }, [goPrev])
  useHotkeys('alt+right', goNext, { preventDefault: true }, [goNext])

  const headerActions = useMemo(
    () => (
      <>
        {!isGlobal && <SaveIndicator status={save.status} onRetry={save.flush} className="mr-1" />}
        {!isToday && (
          <Button variant="outline" size="sm" onClick={goToday}>
            Today
          </Button>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Done today"
              aria-pressed={railOpen}
              onClick={toggleRail}
              className={cn('text-muted-foreground', railOpen && 'bg-accent text-foreground')}
            >
              <PanelRight />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Done today</TooltipContent>
        </Tooltip>
        {!isGlobal && entry && <JournalEntryMenu onClear={clearEntry} />}
      </>
    ),
    [isGlobal, save, isToday, goToday, railOpen, toggleRail, entry, clearEntry],
  )
  usePageHeader({ title: 'Journal', actions: headerActions })

  if (invalid) return <Navigate to={p.journal()} replace />

  const rail = <DoneThatDay spaceIds={scopeSpaceIds} date={date} isToday={isToday} />

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <DateStrip
        selected={date}
        today={today}
        spaceIds={scopeSpaceIds}
        weekStartsOn={weekStartsOn}
        onSelect={goTo}
      />
      <div className="flex flex-1">
        <div className="min-w-0 flex-1 px-4 pt-10 pb-24 md:px-14">
          <div className="mx-auto max-w-170">
            <JournalDateHeading date={date}>
              {isGlobal ? (
                <span>Every space’s entry, read-only · open a space to write</span>
              ) : null}
            </JournalDateHeading>
            {isGlobal ? (
              <JournalGlobalDay date={date} className="mt-8" />
            ) : (
              <JournalEditor
                spaceId={space.id}
                date={date}
                resetKey={resetKey}
                onSaveState={setSave}
                className="mt-8"
              />
            )}
          </div>
        </div>
        <DetailRail open={railOpen}>{rail}</DetailRail>
      </div>
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="overflow-y-auto data-[side=right]:w-80">
          <SheetHeader>
            <SheetTitle>Done today</SheetTitle>
            <SheetDescription>What got done on this day.</SheetDescription>
          </SheetHeader>
          <div className="px-4">{rail}</div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
