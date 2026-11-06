import type { Ledger } from '@sand/ledger/contract'
import { bounds, type Range } from '@sand/ical'
import type { Calendar, CalendarEvent } from '../contract'
import { schema } from './schema'

type CalendarRow = { data: string }
type EventRow = { data: string }

const toEvent = (row: EventRow): CalendarEvent => JSON.parse(row.data)

export const createStore = (ledger: Ledger) => {
  ledger.migrate('calendar', schema)
  const { db } = ledger
  const allCalendars = db.query<CalendarRow, []>('select data from calendars order by created, id')
  const saveCalendar = db.query<unknown, { id: string; provider: string; data: string; created: number }>(
    `insert into calendars (id, provider, data, created) values ($id, $provider, $data, $created)
     on conflict (id) do update set data = excluded.data`,
  )
  const dropCalendar = db.query<unknown, { id: string }>('delete from calendars where id = $id')
  const tokenOf = db.query<{ token: string | null }, { id: string }>('select token from calendars where id = $id')
  const setToken = db.query<unknown, { id: string; token: string | null }>('update calendars set token = $token where id = $id')
  const allEvents = db.query<EventRow, { calendar: string }>('select data from calendar_events where calendar = $calendar order by series is not null, first')
  const oneEvent = db.query<EventRow, { calendar: string; id: string }>('select data from calendar_events where calendar = $calendar and id = $id')
  const inRange = db.query<EventRow, { calendar: string; from: number; to: number }>(
    'select data from calendar_events where calendar = $calendar and first < $to and (last is null or last > $from)',
  )
  const ofSeries = db.query<EventRow, { calendar: string; series: string }>('select data from calendar_events where calendar = $calendar and series = $series')
  const saveEvent = db.query<unknown, { calendar: string; id: string; series: string | null; first: number; last: number | null; data: string }>(
    `insert or replace into calendar_events (calendar, id, series, first, last, data) values ($calendar, $id, $series, $first, $last, $data)`,
  )
  const dropEvent = db.query<unknown, { calendar: string; id: string }>('delete from calendar_events where calendar = $calendar and id = $id')
  const clearEvents = db.query<unknown, { calendar: string }>('delete from calendar_events where calendar = $calendar')

  const save = (event: CalendarEvent) =>
    void saveEvent.run({ calendar: event.calendar, id: event.id, series: event.series ?? null, ...bounds(event), data: JSON.stringify(event) })

  return {
    calendars: () => allCalendars.all().map((row): Calendar => JSON.parse(row.data)),
    saveCalendar: (calendar: Calendar) => void saveCalendar.run({ id: calendar.id, provider: calendar.provider, data: JSON.stringify(calendar), created: Date.now() }),
    dropCalendar: (id: string) =>
      ledger.tx(() => {
        clearEvents.run({ calendar: id })
        dropCalendar.run({ id })
      }),
    token: (id: string) => tokenOf.get({ id })?.token ?? undefined,
    setToken: (id: string, token: string | undefined) => void setToken.run({ id, token: token ?? null }),
    events: (calendar: string) => allEvents.all({ calendar }).map(toEvent),
    event: (calendar: string, id: string) => {
      const row = oneEvent.get({ calendar, id })
      return row ? toEvent(row) : undefined
    },
    inRange: (calendar: string, { from, to }: Range) => inRange.all({ calendar, from, to }).map(toEvent),
    series: (calendar: string, series: string) => ofSeries.all({ calendar, series }).map(toEvent),
    save: (events: CalendarEvent[]) => ledger.tx(() => events.forEach(save)),
    drop: (calendar: string, ids: string[]) => ledger.tx(() => ids.forEach(id => dropEvent.run({ calendar, id }))),
    clear: (calendar: string) => void clearEvents.run({ calendar }),
  }
}

export type Store = ReturnType<typeof createStore>
