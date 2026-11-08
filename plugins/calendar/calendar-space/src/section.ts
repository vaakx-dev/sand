import type { Occurrence } from '@sand/calendar/contract'
import type { Route, ShellRow, ShellSection } from '@sand/ui-shell/contract'
import { clockLabel, isAllDay, startOfDay, weekdayLabel } from './days'
import { eventKey, type CalendarModel } from './model'

export const calendarKind = 'calendar'

export const calendarRoute = (event?: Occurrence): Route => ({ kind: calendarKind, ...(event && { tab: eventKey(event) }) })

const whenOf = (event: Occurrence) => {
  const today = startOfDay(event.from) <= startOfDay(Date.now())
  if (isAllDay(event.start)) return today ? 'Today' : weekdayLabel(event.from)
  if (event.from <= Date.now()) return 'Now'
  return today ? clockLabel(event.from) : `${weekdayLabel(event.from)} ${clockLabel(event.from)}`
}

const rowOf = (event: Occurrence): ShellRow => ({
  id: eventKey(event),
  label: event.title,
  end: whenOf(event),
  to: calendarRoute(event),
})

export const calendarSection = (model: CalendarModel, open: () => void): ShellSection => ({
  id: 'calendar',
  order: 30,
  groups: () => [
    {
      id: 'calendar',
      label: 'Calendar',
      action: { label: 'Open Calendar', icon: 'calendar', run: open },
      rows: model.upcoming.get().map(rowOf),
    },
  ],
})
