import { useCallback, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { formatQuarter, getFiscalQuarter, getFiscalWeek } from '@/lib/fiscal'
import { parseISODate } from '@/lib/dates'
import { useSpace } from '@/context/SpaceContext'
import { fadeIn } from '@/components/motion/presets'
import { usePageHeader } from '@/components/layout/PageHeaderContext'
import { ErrorState } from '@/components/shared/ErrorState'
import { AgendaView } from '@/features/calendar/components/AgendaView'
import { CalendarToolbar } from '@/features/calendar/components/CalendarToolbar'
import { EventDialog } from '@/features/calendar/components/EventDialog'
import { MonthView } from '@/features/calendar/components/MonthView'
import { TimeGrid } from '@/features/calendar/components/TimeGrid'
import { useCalendarDragActions } from '@/features/calendar/hooks/useCalendarDragActions'
import { useCalendarItems } from '@/features/calendar/hooks/useCalendarItems'
import { useCalendarLayers } from '@/features/calendar/hooks/useCalendarLayers'
import { useCalendarState } from '@/features/calendar/hooks/useCalendarState'
import { formatRangeTitle, groupItemsByDay, slotToFormValues } from '@/features/calendar/utils'
import { usePreferences } from '@/features/settings/api'
import { useToggleTodo } from '@/features/todos/api'

/** Calendar (design: Calendar): Month, Week, Day and Agenda views of events plus due tasks and todos. */
export default function CalendarPage() {
  usePageHeader({ title: 'Calendar' })
  const { isGlobal, scopeSpaceIds } = useSpace()
  const { fyStartMonth } = usePreferences()
  const cal = useCalendarState()
  const { layers, toggle } = useCalendarLayers()
  const { items, isLoading, error, refetch } = useCalendarItems({
    spaceIds: scopeSpaceIds,
    range: cal.range,
    layers,
  })
  const entriesByDay = useMemo(
    () => groupItemsByDay(items, cal.range.days, cal.timeZone),
    [items, cal.range.days, cal.timeZone],
  )
  const toggleTodo = useToggleTodo()
  const { moveEvent, resizeEvent, moveTask } = useCalendarDragActions(cal.timeZone)
  const [create, setCreate] = useState({ open: false, initialValues: null })

  // The open event: from the loaded range when it's there, else the deep-link fetch.
  const editing = cal.eventId
    ? (items.find((i) => i.kind === 'event' && i.id === cal.eventId)?.raw ?? cal.linkedEvent)
    : null

  const openCreate = useCallback(
    (isoDate) =>
      setCreate({
        open: true,
        initialValues: isoDate ? { start_date: isoDate, end_date: isoDate } : null,
      }),
    [],
  )
  const onCreateRange = useCallback(
    (day, startMin, endMin) =>
      setCreate({ open: true, initialValues: slotToFormValues(day, startMin, endMin) }),
    [],
  )
  const { openEvent } = cal
  const onOpenEvent = useCallback((item) => openEvent(item.id), [openEvent])
  const onToggleTodo = useCallback(
    (item) => toggleTodo.mutate({ id: item.id, is_done: !item.done }),
    [toggleTodo],
  )

  const date = parseISODate(cal.date)
  const quarter = formatQuarter(getFiscalQuarter(date, fyStartMonth), fyStartMonth)
  const subtitle = [
    quarter,
    cal.view !== 'month' && `W${getFiscalWeek(date, fyStartMonth, cal.weekStartsOn)}`,
    isGlobal && 'Global',
  ]
    .filter(Boolean)
    .join(' · ')

  const viewProps = {
    today: cal.today,
    entriesByDay,
    loading: isLoading,
    timeZone: cal.timeZone,
    onCreate: openCreate,
    onOpenEvent,
    onToggleTodo,
  }

  return (
    <div className="flex w-full flex-1 flex-col px-4 pt-8 pb-8 md:px-9">
      <CalendarToolbar
        title={formatRangeTitle(cal.view, cal.date, cal.weekStartsOn)}
        subtitle={subtitle}
        view={cal.view}
        onViewChange={cal.setView}
        onToday={cal.goToday}
        onPrev={cal.goPrev}
        onNext={cal.goNext}
        onCreate={openCreate}
        layers={layers}
        onToggleLayer={toggle}
        hotkeysEnabled={!create.open && !editing}
      />

      {error && (
        <ErrorState
          error={error}
          onRetry={refetch}
          title="Couldn’t load the calendar"
          className="mt-4"
        />
      )}

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={cal.view}
          variants={fadeIn}
          initial="initial"
          animate="animate"
          exit="exit"
          className="mt-5 flex flex-1 flex-col"
        >
          {cal.view === 'agenda' ? (
            <AgendaView days={cal.range.days} {...viewProps} />
          ) : cal.view === 'week' || cal.view === 'day' ? (
            <TimeGrid
              days={cal.range.days}
              onCreateRange={onCreateRange}
              onMoveEvent={moveEvent}
              onResizeEvent={resizeEvent}
              {...viewProps}
            />
          ) : (
            <MonthView
              date={cal.date}
              weekStartsOn={cal.weekStartsOn}
              direction={cal.direction}
              onMoveEvent={moveEvent}
              onMoveTask={moveTask}
              {...viewProps}
            />
          )}
        </motion.div>
      </AnimatePresence>

      <EventDialog
        open={create.open}
        onOpenChange={(open) => setCreate((s) => ({ ...s, open }))}
        initialValues={create.initialValues}
      />
      <EventDialog
        key={editing?.id ?? 'none'}
        open={!!editing}
        onOpenChange={(open) => !open && cal.closeEvent()}
        event={editing}
      />
    </div>
  )
}
