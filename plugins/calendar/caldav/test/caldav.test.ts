import { calendarAgenda, calendarCreate, calendarList, calendarRemove, calendarRespond, calendars, calendarUpdate, type Occurrence } from '@sand/calendar/contract'
import { connections } from '@sand/connections/contract'
import { startSand, type Sand } from '@sand/harness'
import { readCalendar } from '@sand/ical'
import { afterEach, expect, test } from 'bun:test'
import { kinds } from '../src/kinds'
import { caldavSource } from '../src/source'
import { account, fakeConnections } from './connections'
import { fakeCaldav, user, type FakeCaldav } from './server'

let server: FakeCaldav
let sand: Sand | undefined

afterEach(async () => {
  await sand?.stop()
  sand = undefined
  server?.stop()
})

const zone = 'Europe/Berlin'
const signal = () => AbortSignal.timeout(5000)
const at = (time: string) => ({ time, zone })

const ics = (...events: string[][]) =>
  ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Apple Inc.//iCloud 2604//EN', ...events.flatMap(lines => ['BEGIN:VEVENT', ...lines, 'END:VEVENT']), 'END:VCALENDAR'].join('\r\n')

const standup = ics(
  [
    'UID:standup@example.com',
    'DTSTART;TZID=Europe/Berlin:20260323T090000',
    'DTEND;TZID=Europe/Berlin:20260323T091500',
    'RRULE:FREQ=WEEKLY;BYDAY=MO,WE;COUNT=6',
    'SUMMARY:Standup',
    'X-APPLE-TRAVEL-ADVISORY-BEHAVIOR:AUTOMATIC',
  ],
  [
    'UID:standup@example.com',
    'RECURRENCE-ID;TZID=Europe/Berlin:20260325T090000',
    'DTSTART;TZID=Europe/Berlin:20260325T110000',
    'DTEND;TZID=Europe/Berlin:20260325T111500',
    'SUMMARY:Standup (late)',
  ],
)

const lunch = (title: string) => ics(['UID:lunch@example.com', 'DTSTART:20260324T110000Z', 'DTEND:20260324T120000Z', `SUMMARY:${title}`])

const invite = ics([
  'UID:review@example.com',
  'DTSTART;TZID=Europe/Berlin:20260326T140000',
  'DTEND;TZID=Europe/Berlin:20260326T150000',
  'SUMMARY:Design review',
  'ORGANIZER;CN=Bo:mailto:bo@example.com',
  'ATTENDEE;CN=Bo;PARTSTAT=ACCEPTED:mailto:bo@example.com',
  'ATTENDEE;RSVP=TRUE;PARTSTAT=NEEDS-ACTION:mailto:me@example.com',
])

const generic = kinds.find(one => one.kind.id === 'caldav')!

const sourceFor = () => caldavSource(generic.login({ server: server.url, ...user }))

const startWith = async () => {
  sand = await startSand([{ id: 'fake', models: ['m'] }], { plugins: ['calendar/calendar', 'calendar/caldav'] })
  const fake = fakeConnections([{ account: account('dav', 'caldav', user.username), values: { server: server.url, ...user } }])
  sand.app.provide(connections, fake.service)
  await sand.app.settled()
  await sand.app.get(calendars)!.sync('dav')
  return sand
}

const lastRequest = (method: string) => server.requests.findLast(request => request.method === method)!

test('iCloud and Fastmail sign in to their own servers with the saved form', () => {
  const login = (id: string, values: Record<string, string>) => kinds.find(one => one.kind.id === id)!.login(values)
  expect(login('icloud', { email: 'me@icloud.com', password: 'p' })).toEqual({ server: 'https://caldav.icloud.com', username: 'me@icloud.com', password: 'p' })
  expect(login('fastmail', { username: 'me@fastmail.com', password: 'p' })).toEqual({ server: 'https://caldav.fastmail.com', username: 'me@fastmail.com', password: 'p' })
  expect(kinds.map(one => [one.kind.id, one.kind.form?.fields.map(field => field.key)])).toEqual([
    ['icloud', ['email', 'password']],
    ['fastmail', ['username', 'password']],
    ['caldav', ['server', 'username', 'password']],
  ])
})

test('an account is found through the well-known redirect and its partition host', async () => {
  server = fakeCaldav()
  const values = { server: server.url, ...user }
  expect(await generic.kind.form!.check(values, signal())).toBe(user.username)
  expect(server.requests.slice(0, 2).map(request => [request.method, request.path])).toEqual([
    ['PROPFIND', '/.well-known/caldav'],
    ['PROPFIND', '/'],
  ])
  expect(server.requests.at(-1)).toMatchObject({ method: 'OPTIONS', host: server.partition, path: '/123/calendars/' })
  await expect(generic.kind.form!.check({ ...values, password: 'wrong' }, signal())).rejects.toThrow('turned down the username or password')

  expect(await sourceFor().calendars(signal())).toEqual([
    { key: 'work', name: 'Work', color: '#FF2D55', zone, email: 'me@example.com', capabilities: ['read', 'write', 'invite'], primary: true },
    { key: 'birthdays', name: 'Birthdays', zone: Temporal.Now.timeZoneId(), email: 'me@example.com', capabilities: ['read'], primary: false },
  ])
})

test('sync-collection loads a calendar, then only what changed, and starts over when the token expires', async () => {
  server = fakeCaldav()
  server.put('standup.ics', standup)
  server.put('lunch.ics', lunch('Lunch'))
  const source = sourceFor()
  await source.calendars(signal())
  const first = await source.sync('work', undefined, signal())
  expect(first).toMatchObject({ reset: true, removed: ['standup.ics', 'lunch.ics'] })
  expect(first.events.map(event => [event.id, event.series, event.title, event.etag])).toEqual([
    ['standup.ics', undefined, 'Standup', '"e2"'],
    ['standup.ics~2026-03-25T09:00:00~Europe/Berlin', 'standup.ics', 'Standup (late)', '"e2"'],
    ['lunch.ics', undefined, 'Lunch', '"e3"'],
  ])

  server.put('lunch.ics', lunch('Long lunch'))
  server.remove('standup.ics')
  await source.calendars(signal())
  const next = await source.sync('work', first.token, signal())
  expect(next.reset).toBeUndefined()
  expect(next.events.map(event => [event.id, event.title])).toEqual([['lunch.ics', 'Long lunch']])
  expect(next.removed).toEqual(['lunch.ics', 'standup.ics'])

  await source.calendars(signal())
  const sent = server.requests.length
  expect(await source.sync('work', next.token, signal())).toEqual({ events: [], removed: [], token: next.token })
  expect(server.requests.length).toBe(sent)

  server.expire()
  server.put('standup.ics', standup)
  await source.calendars(signal())
  const again = await source.sync('work', next.token, signal())
  expect(again.reset).toBe(true)
  expect(again.events.map(event => event.id)).toEqual(['lunch.ics', 'standup.ics', 'standup.ics~2026-03-25T09:00:00~Europe/Berlin'])
})

test('without sync-collection the etags are listed and compared with the last listing', async () => {
  server = fakeCaldav({ syncCollection: false })
  server.put('standup.ics', standup)
  server.put('lunch.ics', lunch('Lunch'))
  const source = sourceFor()
  await source.calendars(signal())
  const first = await source.sync('work', undefined, signal())
  expect(first.reset).toBe(true)
  expect(first.events).toHaveLength(3)

  server.put('lunch.ics', lunch('Long lunch'))
  server.remove('standup.ics')
  server.put('dinner.ics', ics(['UID:dinner', 'DTSTART:20260324T180000Z', 'DTEND:20260324T190000Z', 'SUMMARY:Dinner']))
  await source.calendars(signal())
  const next = await source.sync('work', first.token, signal())
  expect(next.reset).toBeUndefined()
  expect(next.events.map(event => [event.id, event.title])).toEqual([
    ['lunch.ics', 'Long lunch'],
    ['dinner.ics', 'Dinner'],
  ])
  expect(next.removed).toEqual(['lunch.ics', 'dinner.ics', 'standup.ics'])

  await source.calendars(signal())
  const sent = server.requests.length
  expect((await source.sync('work', next.token, signal())).events).toEqual([])
  expect(server.requests.length).toBe(sent)
  expect(server.requests.some(request => request.body.includes('sync-collection'))).toBe(false)
})

test('events are created, changed and deleted with etags, and editing one occurrence rewrites its resource', async () => {
  server = fakeCaldav()
  server.put('standup.ics', standup)
  const { ask } = await startWith()
  const work = 'dav/work'

  const dentist = await ask(calendarCreate, { calendar: work, event: { title: 'Dentist', start: at('2026-03-24T08:00'), end: at('2026-03-24T09:00') } })
  expect(dentist.id).toMatch(/^[\w-]+\.ics$/)
  expect(lastRequest('PUT').headers['if-none-match']).toBe('*')
  const moved = await ask(calendarUpdate, { target: { calendar: work, id: dentist.id }, patch: { title: 'Dentist (moved)' }, scope: 'series' })
  expect(lastRequest('PUT').headers['if-match']).toBe(dentist.etag!)
  expect(readCalendar(server.ics(dentist.id)!, zone).map(event => event.title)).toEqual(['Dentist (moved)'])

  const added = await ask(calendarUpdate, {
    target: { calendar: work, id: 'standup.ics', original: at('2026-03-30T09:00:00') },
    patch: { title: 'Standup with guests' },
    scope: 'occurrence',
  })
  expect(added).toMatchObject({ id: 'standup.ics~2026-03-30T09:00:00~Europe/Berlin', series: 'standup.ics' })
  await ask(calendarUpdate, { target: { calendar: work, id: 'standup.ics~2026-03-25T09:00:00~Europe/Berlin' }, patch: { title: 'Standup (later)' }, scope: 'occurrence' })
  await ask(calendarRemove, { target: { calendar: work, id: 'standup.ics', original: at('2026-04-01T09:00:00') }, scope: 'occurrence' })

  const rewrites = server.requests.filter(request => request.method === 'PUT' && request.path.endsWith('/standup.ics'))
  expect(rewrites.map(request => Boolean(request.headers['if-match']))).toEqual([true, true, true])
  const resource = server.ics('standup.ics')!
  expect(resource).toContain('X-APPLE-TRAVEL-ADVISORY-BEHAVIOR:AUTOMATIC')
  expect(readCalendar(resource, zone).map(event => [event.title, event.original, event.recurrence?.exdates])).toEqual([
    ['Standup', undefined, [at('2026-04-01T09:00:00')]],
    ['Standup (later)', at('2026-03-25T09:00:00'), undefined],
    ['Standup with guests', at('2026-03-30T09:00:00'), undefined],
  ])
  const week = await ask(calendarAgenda, { from: Date.parse('2026-03-23T00:00Z'), to: Date.parse('2026-04-09T00:00Z'), zone, calendars: [work] })
  expect(week.map(({ title, start }: Occurrence) => [title, start])).toEqual([
    ['Standup', at('2026-03-23T09:00:00')],
    ['Dentist (moved)', at('2026-03-24T08:00:00')],
    ['Standup (later)', at('2026-03-25T11:00:00')],
    ['Standup with guests', at('2026-03-30T09:00:00')],
    ['Standup', at('2026-04-06T09:00:00')],
    ['Standup', at('2026-04-08T09:00:00')],
  ])

  await ask(calendarRemove, { target: { calendar: work, id: moved.id }, scope: 'series' })
  expect(lastRequest('DELETE')).toMatchObject({ path: `/123/calendars/work/${dentist.id}`, headers: { 'if-match': moved.etag } })
  expect(server.names()).toEqual(['standup.ics'])
})

test.each([true, false])('answering an invitation sets my PARTSTAT, and the server replies to the organizer only with auto-schedule (%p)', async schedule => {
  server = fakeCaldav({ schedule })
  server.put('invite.ics', invite)
  const { ask } = await startWith()
  const work = (await ask(calendarList, {})).find(calendar => calendar.id === 'dav/work')!
  expect(work.capabilities).toEqual(schedule ? ['read', 'write', 'invite'] : ['read', 'write'])

  const [review] = await ask(calendarAgenda, { from: Date.parse('2026-03-26T00:00Z'), to: Date.parse('2026-03-27T00:00Z'), zone, calendars: [work.id] })
  expect(review).toMatchObject({ id: 'invite.ics', response: 'needs-action' })
  const answered = await ask(calendarRespond, { target: { calendar: work.id, id: 'invite.ics' }, response: 'accepted' })
  expect(answered.response).toBe('accepted')
  expect(lastRequest('PUT').headers['schedule-reply']).toBe(schedule ? undefined : 'F')
  expect(server.ics('invite.ics')!.replace(/\r\n /g, '')).toContain('ATTENDEE;RSVP=TRUE;PARTSTAT=ACCEPTED:mailto:me@example.com')
  expect(server.ics('invite.ics')).toContain('ATTENDEE;CN=Bo;PARTSTAT=ACCEPTED')
})
