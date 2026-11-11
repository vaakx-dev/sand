import { calendarAgenda, calendarChangeWire, type Occurrence } from '@sand/calendar/contract'
import { wireHello } from '@sand/devices-contract'
import { owned } from '@sand/reactive'
import { clock, derive, effect, sig } from '@vaakx-dev/vrui'
import type { CalendarContext } from './context'
import { addDays, browserZone, clockLabel, isAllDay, startOfDay } from './days'

const upcoming = (events: Occurrence[], now: number) =>
  events.filter(event => !isAllDay(event.start) && event.from > now).toSorted((a, b) => a.from - b.from)[0]

export const nextToday = (ctx: CalendarContext) => {
  const events = sig<Occurrence[]>([])
  const minute = owned(ctx, () => clock(60_000))
  const day = owned(ctx, () => derive(() => startOfDay(minute.get())))

  const load = () => {
    const from = startOfDay(Date.now())
    void ctx.wire.call(calendarAgenda, { from, to: addDays(from, 1), zone: browserZone() }).then(
      found => events.set(found),
      () => events.set([]),
    )
  }

  owned(ctx, () =>
    effect(() => {
      day.get()
      if (ctx.wire.ready()) load()
    }),
  )
  ctx.on(wireHello, load)
  ctx.effect(() => ctx.wire.on(calendarChangeWire, load))

  return () => {
    const next = upcoming(events.get(), minute.get())
    return next ? `${next.title || 'Event'} ${clockLabel(next.from)}` : ''
  }
}
