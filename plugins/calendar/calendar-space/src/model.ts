import {
  calendarAgenda,
  calendarChangeWire,
  calendarCreate,
  calendarList,
  calendarRemove,
  calendarRespond,
  calendarsChangeWire,
  calendarUpdate,
  type Answer,
  type Calendar,
  type EventDraft,
  type EventPatch,
  type Occurrence,
  type Scope,
  type Target,
} from '@sand/calendar/contract'
import { calendarExport, calendarFeed, calendarImport } from '@sand/calendar-local/contract'
import { wireHello } from '@sand/devices-contract'
import { owned } from '@sand/reactive'
import { errorMessage, joinDisposers } from '@sand/util'
import { a, derive, effect, onInterval, sig, stored, untrack } from '@vaakx-dev/vrui'
import type { CalendarContext } from './context'
import { addDays, browserZone, startOfDay, startOfWeek } from './days'

export type Mode = 'agenda' | 'week'

export interface Shown {
  mode: Mode
  from: number
  to: number
  events: Occurrence[]
}

const modes: Mode[] = ['agenda', 'week']

const upcomingCount = 3

const upcomingEvery = 5 * 60_000

export const eventKey = (event: Occurrence) => `${event.from}:${event.calendar}:${event.id}`

interface Span {
  first(at: number): number
  days: number
  step: number
}

const spanOf = (mode: Mode, narrow: boolean): Span => {
  if (mode === 'agenda') return { first: startOfDay, days: 28, step: 7 }
  return narrow ? { first: startOfDay, days: 3, step: 3 } : { first: startOfWeek, days: 7, step: 7 }
}

const download = (name: string, text: string) => {
  const href = URL.createObjectURL(new Blob([text], { type: 'text/calendar' }))
  a({ href, download: name }).click()
  URL.revokeObjectURL(href)
}

export const calendarModel = (ctx: CalendarContext) => {
  const calendars = sig<Calendar[]>([])
  const mode = stored<Mode>('sand.calendar.view', 'agenda', value => modes.includes(value as Mode))
  const narrow = sig(false)
  const anchor = sig(startOfDay(Date.now()))
  const span = derive(() => spanOf(mode.get(), narrow.get()))
  const range = derive(() => {
    const from = span.get().first(anchor.get())
    return { from, to: addDays(from, span.get().days) }
  })
  const shown = sig<Shown | undefined>(undefined)
  const failure = sig<string | undefined>(undefined)
  const upcoming = sig<Occurrence[]>([])

  let asked = 0
  const load = () => {
    const ask = ++asked
    const { from, to } = untrack(() => range.get())
    const showing = untrack(() => mode.get())
    void ctx.wire.call(calendarAgenda, { from, to, zone: browserZone() }).then(
      events => {
        if (ask !== asked) return
        shown.set({ mode: showing, from, to, events })
        failure.set(undefined)
      },
      (error: unknown) => failure.set(errorMessage(error)),
    )
  }
  const loadUpcoming = () => {
    const from = startOfDay(Date.now())
    void ctx.wire.call(calendarAgenda, { from, to: addDays(from, 2), zone: browserZone() }).then(
      events => upcoming.set(events.filter(({ to }) => to > Date.now()).slice(0, upcomingCount)),
      (error: unknown) => ctx.report(error),
    )
  }
  const reload = () => {
    load()
    loadUpcoming()
  }
  const loadCalendars = () => void ctx.wire.call(calendarList, {}).then(list => calendars.set(list), (error: unknown) => ctx.report(error))
  const refresh = () => {
    loadCalendars()
    reload()
  }

  owned(ctx, () =>
    effect(() => {
      range.get()
      load()
    }),
  )
  ctx.on(wireHello, refresh)
  if (ctx.wire.ready()) {
    loadCalendars()
    loadUpcoming()
  }
  ctx.effect(() => onInterval(loadUpcoming, upcomingEvery))
  ctx.effect(() => joinDisposers(ctx.wire.on(calendarChangeWire, reload), ctx.wire.on(calendarsChangeWire, list => calendars.set(list))))

  const step = (direction: 1 | -1) => anchor.update(at => addDays(span.get().first(at), direction * span.get().step))

  return {
    calendars,
    writable: derive(() => calendars.get().filter(calendar => calendar.capabilities.includes('write'))),
    mode,
    narrow,
    anchor,
    range,
    shown,
    failure,
    upcoming,
    find: (key: string) => [...upcoming.get(), ...(shown.get()?.events ?? [])].find(event => eventKey(event) === key),
    retry: load,
    show: (next: Mode) => mode.set(next),
    today: () => anchor.set(startOfDay(Date.now())),
    earlier: () => step(-1),
    later: () => step(1),
    create: (event: EventDraft, calendar?: string) => ctx.wire.call(calendarCreate, { event, ...(calendar && { calendar }) }),
    update: (target: Target, patch: EventPatch, scope: Scope) => ctx.wire.call(calendarUpdate, { target, patch, scope }),
    remove: (target: Target, scope: Scope) => ctx.wire.call(calendarRemove, { target, scope }),
    respond: (target: Target, response: Answer) => ctx.wire.call(calendarRespond, { target, response }),
    importFile: async (file: File) => ctx.wire.call(calendarImport, { ics: await file.text() }),
    exportFile: async (calendar: Calendar) => download(`${calendar.name}.ics`, await ctx.wire.call(calendarExport, { calendar: calendar.id })),
    feed: async (calendar: Calendar) => new URL(await ctx.wire.call(calendarFeed, { calendar: calendar.id }), location.origin).href,
  }
}

export type CalendarModel = ReturnType<typeof calendarModel>
