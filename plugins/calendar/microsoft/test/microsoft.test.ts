import { calendarAgenda, calendarCreate, calendarList, calendarRemove, calendarRespond, calendarUpdate, calendars, type Occurrence } from '@sand/calendar/contract'
import { connections, type Account } from '@sand/connections/contract'
import { startSand, type Sand } from '@sand/harness'
import { afterEach, expect, test } from 'bun:test'
import { microsoftCalendar } from '../src'
import type { Item } from '../src/graph'
import { date, fakeConnections, fakeGraph, instantText, item, removed, utc, zone, type FakeGraph } from './fake'

let sand: Sand
let graph: FakeGraph

afterEach(async () => {
  await sand.stop()
  graph.stop()
})

const account = (readOnly = false): Account => ({ id: 'ms', kind: 'microsoft-calendar', name: 'me@contoso.com', readOnly, added: 0 })

const main = 'ms/cal-main'

const at = (day: string, time: string) => ({ time: `${day}T${time}:00`, zone })

const weekly = (count: number): Item['recurrence'] => ({
  pattern: { type: 'weekly', interval: 1, month: 0, dayOfMonth: 0, daysOfWeek: ['monday'], firstDayOfWeek: 'sunday', index: 'first' },
  range: { type: 'numbered', startDate: date(0), endDate: '0001-01-01', numberOfOccurrences: count, recurrenceTimeZone: 'W. Europe Standard Time' },
})

const standup = () => item({ id: 'standup', type: 'seriesMaster', subject: 'Standup', start: utc(date(0), '09:00'), end: utc(date(0), '09:15'), recurrence: weekly(4) })

const occurrence = (week: number, fields: Partial<Item> = {}) =>
  item({
    id: `standup-${week}`,
    type: 'occurrence',
    seriesMasterId: 'standup',
    subject: 'Standup',
    start: utc(date(week * 7), '09:00'),
    end: utc(date(week * 7), '09:15'),
    originalStart: instantText(date(week * 7), '09:00'),
    ...fields,
  })

const moved = () =>
  occurrence(2, { type: 'exception', subject: 'Standup moved', start: utc(date(15), '10:00'), end: utc(date(15), '10:15') })

const lunch = (id = 'lunch') =>
  item({
    id,
    subject: 'Lunch',
    start: utc(date(1), '12:00', 'America/Los_Angeles'),
    end: utc(date(1), '13:00', 'America/Los_Angeles'),
    originalStartTimeZone: 'Pacific Standard Time',
    originalEndTimeZone: 'Pacific Standard Time',
  })

const offsite = () =>
  item({ id: 'offsite', subject: 'Offsite', isAllDay: true, start: { dateTime: `${date(3)}T00:00:00.0000000`, timeZone: 'UTC' }, end: { dateTime: `${date(4)}T00:00:00.0000000`, timeZone: 'UTC' } })

const start = async (readOnly = false) => {
  sand = await startSand([{ id: 'fake', models: ['m'] }], { plugins: ['calendar/calendar'] })
  const fake = fakeConnections([account(readOnly)])
  sand.app.provide(connections, fake.service)
  sand.app.plugin(microsoftCalendar({ api: graph.api, authorize: 'http://127.0.0.1:9/authorize', token: 'http://127.0.0.1:9/token' }))
  await sand.app.settled()
  const service = sand.app.get(calendars)
  if (!service) throw new Error('calendars did not start')
  await service.sync('ms')
  return { service, kinds: fake.kinds }
}

const agenda = async () =>
  (await sand.ask(calendarAgenda, { from: Date.parse(`${date(-1)}T00:00:00Z`), to: Date.parse(`${date(28)}T00:00:00Z`), zone, calendars: [main] })).map(
    ({ title, start, original }: Occurrence) => [title, start, ...(original ? [original] : [])],
  )

const emptyTeam = () => {
  graph.deltas.set('cal-team:start', { value: [], delta: 'team-1' })
  graph.deltas.set('cal-team:team-1', { value: [], delta: 'team-1' })
}

test('a full sync pages through instances, builds series from their masters and maps Windows time zones', async () => {
  graph = fakeGraph()
  graph.put(standup(), occurrence(0), occurrence(1), moved(), occurrence(3), lunch(), offsite())
  graph.deltas.set('cal-main:start', { value: [occurrence(0), occurrence(1)], next: 'page-2' })
  graph.deltas.set('cal-main:page-2', { value: [moved(), occurrence(3), lunch(), offsite()], delta: 'd1' })
  emptyTeam()
  const { kinds } = await start()

  expect(await sand.ask(calendarList, {})).toEqual([
    { id: main, provider: 'ms', name: 'Calendar', color: '#3a96dd', email: 'me@contoso.com', zone: expect.any(String), capabilities: ['read', 'write', 'invite', 'freebusy'], primary: true },
    { id: 'ms/cal-team', provider: 'ms', name: 'Team', email: 'team@contoso.com', zone: expect.any(String), capabilities: ['read', 'freebusy'], primary: false },
  ])
  expect(await agenda()).toEqual([
    ['Standup', at(date(0), '09:00'), at(date(0), '09:00')],
    ['Lunch', { time: `${date(1)}T12:00:00`, zone: 'America/Los_Angeles' }],
    ['Offsite', { date: date(3) }],
    ['Standup', at(date(7), '09:00'), at(date(7), '09:00')],
    ['Standup moved', at(date(15), '10:00'), at(date(14), '09:00')],
    ['Standup', at(date(21), '09:00'), at(date(21), '09:00')],
  ])
  expect(sand.app.get(calendars)?.get(main, 'standup')).toMatchObject({ recurrence: { rule: 'FREQ=WEEKLY;COUNT=4;BYDAY=MO;WKST=SU' }, start: at(date(0), '09:00') })
  expect(graph.seen('GET', 'me/events/standup')).toHaveLength(2)
  const [first] = graph.seen('GET', 'me/calendars/cal-main/calendarView/delta')
  expect(first?.prefer).toContain('outlook.timezone="UTC"')
  expect(Date.parse(first?.query.endDateTime ?? '') - Date.parse(first?.query.startDateTime ?? '')).toBe(3 * 365 * 86_400_000)

  expect(kinds).toEqual([expect.objectContaining({ id: 'microsoft-calendar', label: 'Outlook Calendar' })])
  const oauth = kinds[0]?.oauth
  expect(oauth).toMatchObject({
    authorize: 'http://127.0.0.1:9/authorize',
    scopes: ['offline_access', 'https://graph.microsoft.com/Calendars.ReadWrite'],
    readOnlyScopes: ['offline_access', 'https://graph.microsoft.com/Calendars.Read'],
    loopback: 'localhost',
  })
  expect(await oauth?.identify((url, init) => fetch(url, init), AbortSignal.timeout(5000))).toBe('me@contoso.com')
})

test('incremental syncs drop removed instances, turn deleted occurrences into skipped dates and drop deleted series', async () => {
  graph = fakeGraph()
  graph.put(standup(), occurrence(0), occurrence(1), moved(), occurrence(3), lunch(), offsite())
  graph.deltas.set('cal-main:start', { value: [occurrence(0), occurrence(1), moved(), occurrence(3), lunch(), offsite()], delta: 'd1' })
  emptyTeam()
  const { service } = await start()

  graph.events.delete('standup-1')
  graph.events.delete('lunch')
  graph.put(occurrence(3, { type: 'exception', subject: 'Standup with demo' }))
  graph.deltas.set('cal-main:d1', { value: [removed('standup-1'), occurrence(3, { type: 'exception', subject: 'Standup with demo' }), removed('lunch')], delta: 'd2' })
  await service.sync('ms')
  expect(await agenda()).toEqual([
    ['Standup', at(date(0), '09:00'), at(date(0), '09:00')],
    ['Offsite', { date: date(3) }],
    ['Standup moved', at(date(15), '10:00'), at(date(14), '09:00')],
    ['Standup with demo', at(date(21), '09:00'), at(date(21), '09:00')],
  ])
  expect(service.get(main, 'standup')?.recurrence?.exdates).toEqual([at(date(7), '09:00')])

  for (const id of ['standup', 'standup-0', 'standup-2', 'standup-3']) graph.events.delete(id)
  graph.deltas.set('cal-main:d2', { value: [removed('standup-0'), removed('standup-2'), removed('standup-3')], delta: 'd3' })
  await service.sync('ms')
  expect(await agenda()).toEqual([['Offsite', { date: date(3) }]])
  expect(service.get(main, 'standup')).toBeUndefined()

  graph.put(lunch('lunch-2'))
  graph.deltas.set('cal-main:start', { value: [lunch('lunch-2')], delta: 'e1' })
  await service.sync('ms')
  expect(graph.requests.some(request => request.query.$deltatoken === 'd3')).toBe(true)
  expect(await agenda()).toEqual([['Lunch', { time: `${date(1)}T12:00:00`, zone: 'America/Los_Angeles' }]])
})

test('writes go to Graph with only what changed and invitations only when attendees are told', async () => {
  graph = fakeGraph()
  const focus = item({ id: 'focus', subject: 'Focus', start: utc(date(2), '08:00'), end: utc(date(2), '10:00') })
  const bo = { emailAddress: { name: 'Bo', address: 'bo@contoso.com' } }
  const review = item({ id: 'review', subject: 'Review', start: utc(date(2), '14:00'), end: utc(date(2), '15:00'), attendees: [{ type: 'required', status: { response: 'accepted' }, ...bo }] })
  const invite = item({
    id: 'invite',
    subject: 'Planning',
    start: utc(date(3), '14:00'),
    end: utc(date(3), '15:00'),
    isOrganizer: false,
    organizer: bo,
    attendees: [{ type: 'required', status: { response: 'none' }, emailAddress: { address: 'me@contoso.com' } }],
    responseStatus: { response: 'notResponded' },
  })
  const notice = item({ id: 'notice', subject: 'All hands', start: utc(date(4), '16:00'), end: utc(date(4), '17:00'), isOrganizer: false, organizer: bo, responseStatus: { response: 'none' } })
  graph.put(standup(), occurrence(0), occurrence(1), occurrence(2), occurrence(3), focus, review, invite, notice)
  graph.deltas.set('cal-main:start', { value: [occurrence(0), occurrence(1), occurrence(3), focus, review, invite, notice], delta: 'd1' })
  graph.deltas.set('cal-main:d1', { value: [], delta: 'd1' })
  emptyTeam()
  const { service } = await start()
  const target = (id: string, original?: ReturnType<typeof at>) => ({ calendar: main, id, ...(original && { original }) })

  const dentist = await sand.ask(calendarCreate, { calendar: main, event: { title: 'Dentist', start: at(date(2), '11:00'), end: at(date(2), '12:00') } })
  expect(dentist).toMatchObject({ id: 'new-1', title: 'Dentist', start: at(date(2), '11:00') })
  const [quiet] = graph.seen('POST', 'me/calendars/cal-main/events')
  expect(quiet?.body).toMatchObject({ subject: 'Dentist', start: { dateTime: `${date(2)}T11:00:00`, timeZone: 'W. Europe Standard Time' }, isAllDay: false, attendees: [], recurrence: null })

  await sand.ask(calendarCreate, { calendar: main, event: { title: 'Sync', start: at(date(5), '11:00'), end: at(date(5), '12:00'), attendees: [{ email: 'bo@contoso.com' }] } })
  expect(graph.seen('POST', 'me/calendars/cal-main/events')[1]?.body?.attendees).toEqual([{ emailAddress: { address: 'bo@contoso.com' }, type: 'required' }])

  await sand.ask(calendarUpdate, { target: target('focus'), patch: { title: 'Deep work' }, scope: 'series' })
  expect(graph.seen('PATCH', 'me/events/focus')).toEqual([expect.objectContaining({ body: { subject: 'Deep work' }, etag: 'W/"1"' })])

  await sand.ask(calendarRemove, { target: target('focus'), scope: 'series' })
  expect(graph.seen('DELETE', 'me/events/focus')).toHaveLength(1)

  await sand.ask(calendarUpdate, { target: target('review'), patch: { attendees: [] }, scope: 'series' })
  expect(graph.seen('PATCH', 'me/events/review')).toEqual([expect.objectContaining({ body: { attendees: [] } })])

  expect(await sand.ask(calendarRespond, { target: target('invite'), response: 'accepted' })).toMatchObject({ id: 'invite', response: 'accepted' })
  expect(graph.seen('POST', 'me/events/invite/accept')).toEqual([expect.objectContaining({ body: { sendResponse: true } })])
  await sand.ask(calendarRespond, { target: target('notice'), response: 'declined' })
  expect(graph.seen('POST', 'me/events/notice/decline')).toEqual([expect.objectContaining({ body: { sendResponse: false } })])

  const edited = await sand.ask(calendarUpdate, { target: target('standup', at(date(14), '09:00')), patch: { title: 'Standup with demo' }, scope: 'occurrence' })
  expect(edited).toMatchObject({ id: 'standup-2', series: 'standup', original: at(date(14), '09:00'), title: 'Standup with demo' })
  expect(graph.seen('GET', 'me/events/standup/instances').at(-1)?.query.startDateTime).toStartWith(date(13))
  expect(graph.seen('PATCH', 'me/events/standup-2')).toEqual([expect.objectContaining({ body: { subject: 'Standup with demo' } })])

  await sand.ask(calendarRemove, { target: target('standup-1'), scope: 'occurrence' })
  expect(graph.seen('DELETE', 'me/events/standup-1')).toHaveLength(1)
  expect(graph.seen('PATCH', 'me/events/standup')).toEqual([])
  expect((await agenda()).filter(([title]) => String(title).startsWith('Standup'))).toEqual([
    ['Standup', at(date(0), '09:00'), at(date(0), '09:00')],
    ['Standup with demo', at(date(14), '09:00'), at(date(14), '09:00')],
    ['Standup', at(date(21), '09:00'), at(date(21), '09:00')],
  ])

  await sand.ask(calendarUpdate, { target: target('standup-3'), patch: { title: 'Daily' }, scope: 'series' })
  expect(graph.seen('PATCH', 'me/events/standup')).toEqual([expect.objectContaining({ body: { subject: 'Daily' } })])
  expect(graph.requests.filter(request => request.method === 'DELETE').map(request => request.path)).toEqual(['me/events/focus', 'me/events/standup-1'])

  graph.schedules.push({
    scheduleId: 'bo@contoso.com',
    scheduleItems: [
      { status: 'busy', start: { dateTime: `${date(2)}T09:00:00.0000000`, timeZone: 'UTC' }, end: { dateTime: `${date(2)}T10:00:00.0000000`, timeZone: 'UTC' } },
      { status: 'free', start: { dateTime: `${date(2)}T11:00:00.0000000`, timeZone: 'UTC' }, end: { dateTime: `${date(2)}T12:00:00.0000000`, timeZone: 'UTC' } },
    ],
  })
  const range = { from: Date.parse(`${date(2)}T00:00:00Z`), to: Date.parse(`${date(3)}T00:00:00Z`) }
  expect(await service.freeBusy(['bo@contoso.com'], range)).toEqual({ 'bo@contoso.com': [{ from: Date.parse(`${date(2)}T09:00:00Z`), to: Date.parse(`${date(2)}T10:00:00Z`) }] })
  expect(graph.seen('POST', 'me/calendar/getSchedule')[0]?.body).toMatchObject({ schedules: ['bo@contoso.com'], startTime: { dateTime: `${date(2)}T00:00:00`, timeZone: 'UTC' } })
})

test('a read-only connection only reads, even calendars it could change', async () => {
  graph = fakeGraph()
  graph.deltas.set('cal-main:start', { value: [], delta: 'd1' })
  emptyTeam()
  await start(true)
  expect((await sand.ask(calendarList, {})).map(calendar => calendar.capabilities)).toEqual([
    ['read', 'freebusy'],
    ['read', 'freebusy'],
  ])
  await expect(sand.ask(calendarCreate, { calendar: main, event: { title: 'Nope', start: at(date(2), '11:00'), end: at(date(2), '12:00') } })).rejects.toThrow(/read-only/)
})
