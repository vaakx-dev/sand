import type { Occurrence } from '@sand/calendar/contract'
import type { Route, Shell, ShellRow, ShellSection } from '@sand/ui-shell/contract'
import { clockLabel, isAllDay } from './days'
import { eventKey, type CalendarModel } from './model'

export const calendarKind = 'calendar'

export const calendarRoute = (event?: Occurrence): Route => ({ kind: calendarKind, ...(event && { tab: eventKey(event) }) })

const rowOf = (event: Occurrence): ShellRow => ({
  id: eventKey(event),
  label: event.title,
  meta: isAllDay(event.start) ? 'All day' : clockLabel(event.from),
  to: calendarRoute(event),
})

export const calendarSection = (shell: Shell, model: CalendarModel): ShellSection => ({
  id: 'calendar',
  order: 30,
  groups: () => [
    {
      id: 'calendar',
      label: 'Calendar',
      action: { label: 'Open Calendar', icon: 'calendar', run: () => shell.open(calendarRoute()) },
      rows: model.upcoming.get().map(rowOf),
    },
  ],
})
