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
import { a, derive, effect, sig, untrack } from '@vaakx-dev/vrui'
import type { CalendarContext } from './context'
import { addDays, browserZone, startOfDay, startOfWeek } from './days'

export type Mode = 'agenda' | 'week'

export interface Shown {
  mode: Mode
  from: number
  to: number
  events: Occurrence[]
}

const spans: Record<Mode, number> = { agenda: 28, week: 7 }

const firstDay: Record<Mode, (at: number) => number> = { agenda: startOfDay, week: startOfWeek }

const download = (name: string, text: string) => {
  const href = URL.createObjectURL(new Blob([text], { type: 'text/calendar' }))
  a({ href, download: name }).click()
  URL.revokeObjectURL(href)
}

export const calendarModel = (ctx: CalendarContext) => {
  const calendars = sig<Calendar[]>([])
  const mode = sig<Mode>('agenda')
  const anchor = sig(startOfDay(Date.now()))
  const range = derive(() => {
    const from = firstDay[mode.get()](anchor.get())
    return { from, to: addDays(from, spans[mode.get()]) }
  })
  const shown = sig<Shown | undefined>(undefined)
  const failure = sig<string | undefined>(undefined)

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
  const loadCalendars = () => void ctx.wire.call(calendarList, {}).then(list => calendars.set(list), (error: unknown) => ctx.report(error))
  const refresh = () => {
    loadCalendars()
    load()
  }

  owned(ctx, () =>
    effect(() => {
      range.get()
      load()
    }),
  )
  ctx.on(wireHello, refresh)
  if (ctx.wire.ready()) loadCalendars()
  ctx.effect(() => joinDisposers(ctx.wire.on(calendarChangeWire, load), ctx.wire.on(calendarsChangeWire, list => calendars.set(list))))

  const step = (direction: 1 | -1) => anchor.update(at => addDays(at, direction * 7))

  return {
    calendars,
    writable: derive(() => calendars.get().filter(calendar => calendar.capabilities.includes('write'))),
    mode,
    anchor,
    range,
    shown,
    failure,
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
