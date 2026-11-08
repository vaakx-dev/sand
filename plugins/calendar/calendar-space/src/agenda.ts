import type { Calendar, Occurrence } from '@sand/calendar/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild, section, span } from '@vaakx-dev/vrui'
import { addDays, clockLabel, dayHeading, dayMs, days, isAllDay } from './days'
import type { CalendarModel, Shown } from './model'

export interface AgendaParts {
  open(event: Occurrence): void
  add(): void
}

const timeOf = (event: Occurrence, day: number) => {
  if (isAllDay(event.start)) return 'All day'
  if (event.from < day) return event.to < addDays(day, 1) ? `– ${clockLabel(event.to)}` : 'All day'
  return clockLabel(event.from)
}

const metaOf = (event: Occurrence, calendars: Calendar[]) => {
  const source = calendars.length > 1 ? calendars.find(calendar => calendar.id === event.calendar)?.name : undefined
  const invited = event.response === 'needs-action' ? 'Invited' : undefined
  return [invited, event.location, source].filter(Boolean).join(' · ') || undefined
}

const row = (kit: Kit, event: Occurrence, day: number, calendars: Calendar[], open: (event: Occurrence) => void) => {
  const meta = metaOf(event, calendars)
  return kit.listRow({
    touch: true,
    title: span(
      { class: ['flex gap-4', event.to <= Date.now() && 'text-neutral-500'] },
      span({ class: ['w-20 shrink-0 tabular-nums', event.to > Date.now() && 'text-neutral-400'] }, timeOf(event, day)),
      span({ class: 'min-w-0 truncate' }, event.title),
    ),
    meta: meta ? span({ class: 'pl-24' }, meta) : undefined,
    onClick: () => open(event),
  })
}

const dayGroup = (kit: Kit, day: number, events: Occurrence[], calendars: Calendar[], open: (event: Occurrence) => void) =>
  section({ class: 'flex flex-col' }, kit.groupHeading(dayHeading(day)), ...events.map(event => row(kit, event, day, calendars, open)))

export const waiting = (kit: Kit, model: CalendarModel) =>
  div(
    { class: 'px-4 py-4' },
    dynamicChild(model.failure, failure => (failure ? kit.errorState({ text: failure, retry: model.retry }) : kit.loadingState())),
  )

const grouped = ({ from, to, events }: Shown) =>
  days(from, Math.round((to - from) / dayMs)).flatMap(day => {
    const end = addDays(day, 1)
    const found = events.filter(event => event.from < end && (event.to > day || event.from === day))
    return found.length ? [{ day, events: found }] : []
  })

const empty = (kit: Kit, add: () => void) =>
  kit.emptyBlock({
    icon: 'calendar',
    title: 'Nothing in the next four weeks',
    text: 'Add an event, or connect a calendar in Settings.',
    action: kit.secondaryAction({ onClick: add }, 'New event'),
  })

export const agendaView = (kit: Kit, model: CalendarModel, parts: AgendaParts) =>
  dynamicChild(
    derive(() => ({ shown: model.shown.get(), calendars: model.calendars.get() })),
    ({ shown, calendars }) => {
      if (shown?.mode !== 'agenda') return waiting(kit, model)
      const groups = grouped(shown)
      if (!groups.length) return kit.pageBody({}, empty(kit, parts.add))
      return kit.pageBody({}, ...groups.map(({ day, events }) => dayGroup(kit, day, events, calendars, parts.open)))
    },
    div({ class: 'flex min-h-0 flex-1 flex-col' }),
  )
