import type { Calendar, Occurrence } from '@sand/calendar/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild, h2, section, span } from '@vaakx-dev/vrui'
import { addDays, clockLabel, dayLabel, dayMs, days, isAllDay, startOfDay } from './days'
import type { CalendarModel, Shown } from './model'

export interface AgendaParts {
  open(event: Occurrence): void
  add(): void
}

const timeOf = (event: Occurrence, day: number) => {
  if (isAllDay(event.start)) return 'All day'
  if (event.from < day) return event.to < addDays(day, 1) ? `until ${clockLabel(event.to)}` : 'All day'
  return clockLabel(event.from)
}

const metaOf = (event: Occurrence, calendars: Calendar[]) => {
  const source = calendars.length > 1 ? calendars.find(calendar => calendar.id === event.calendar)?.name : undefined
  return [event.location, source].filter(Boolean).join(' · ') || undefined
}

const row = (kit: Kit, event: Occurrence, day: number, calendars: Calendar[], open: (event: Occurrence) => void) =>
  kit.listRow({
    touch: true,
    lead: span({ class: 'w-16 text-xs tabular-nums' }, timeOf(event, day)),
    title: event.title,
    meta: metaOf(event, calendars),
    trail: event.response === 'needs-action' ? kit.badge('accent', 'Invited') : null,
    onClick: () => open(event),
  })

const dayGroup = (kit: Kit, day: number, events: Occurrence[], calendars: Calendar[], open: (event: Occurrence) => void) =>
  section(
    { class: 'flex flex-col gap-1' },
    h2(
      { class: 'flex items-baseline gap-2 px-2 text-sm font-medium text-neutral-100' },
      dayLabel(day),
      startOfDay(Date.now()) === day ? span({ class: 'text-xs text-accent-400' }, 'Today') : null,
    ),
    div({ class: 'flex flex-col' }, ...events.map(event => row(kit, event, day, calendars, open))),
  )

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

export const agendaView = (kit: Kit, model: CalendarModel, parts: AgendaParts) =>
  div(
    { class: 'flex min-h-0 flex-1 flex-col overflow-auto overscroll-contain', style: kit.stableGutter },
    dynamicChild(
      derive(() => ({ shown: model.shown.get(), calendars: model.calendars.get() })),
      ({ shown, calendars }) => {
        if (shown?.mode !== 'agenda') return waiting(kit, model)
        const groups = grouped(shown)
        if (!groups.length) return div({ class: 'px-4 py-4' }, kit.emptyState({ text: 'Nothing planned for these four weeks.', action: kit.secondaryAction({ size: 'sm', onClick: parts.add }, 'New event') }))
        return div({ class: 'mx-auto flex w-full max-w-3xl flex-col gap-6 px-2 pt-3 pb-16 md:px-4' }, ...groups.map(({ day, events }) => dayGroup(kit, day, events, calendars, parts.open)))
      },
    ),
  )
