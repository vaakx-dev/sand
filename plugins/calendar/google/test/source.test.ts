import { afterEach, expect, test } from 'bun:test'
import { createSource } from '../src/source'
import { type Answer, events, failure, fakeGoogle, moved, primary, review, standup } from './fake'

let google: ReturnType<typeof fakeGoogle>

afterEach(() => google.stop())

const signal = new AbortController().signal

const sourceFor = (answer: Answer, readOnly = false) => {
  google = fakeGoogle(answer)
  return createSource({ fetch: (url, init) => fetch(url, init), api: google.api, readOnly })
}

const calendar = 'me@example.com'

const zone = 'Europe/Berlin'

test('a first sync pages through every event, then follows sync tokens, and starts over when Google drops the token', async () => {
  const source = sourceFor(events)
  const first = await source.sync(calendar, undefined, signal)
  expect(first).toMatchObject({ reset: true, more: true, removed: [] })
  expect(first.events.map(event => event.id)).toEqual(['standup', 'review'])
  const second = await source.sync(calendar, first.token, signal)
  expect(second.reset).toBeUndefined()
  expect(second.more).toBeUndefined()
  expect(second.token).toBe('syncToken=s1')
  const [full, page] = google.seen
  expect(full!.query).toMatchObject({ singleEvents: 'false', showDeleted: 'true' })
  expect(full!.query.timeMin).toBeDefined()
  expect(full!.query.syncToken).toBeUndefined()
  expect(page!.query).toMatchObject({ pageToken: 'p2', timeMin: full!.query.timeMin })

  const changes = await source.sync(calendar, second.token, signal)
  expect(changes).toEqual({ events: [], removed: ['trip', 'old'], token: 'syncToken=s2' })
  expect(google.seen[2]!.query.timeMin).toBeUndefined()

  const again = await source.sync(calendar, changes.token, signal)
  expect(again).toMatchObject({ reset: true, more: true })
  expect(google.seen.slice(3).map(seen => seen.query.syncToken)).toEqual(['s2', undefined])
})

test('masters keep their recurrence, exceptions point at their series and cancelled ones stay as cancelled overrides', async () => {
  const source = sourceFor(events)
  const first = await source.sync(calendar, undefined, signal)
  const second = await source.sync(calendar, first.token, signal)
  const byId = Object.fromEntries([...first.events, ...second.events].map(event => [event.id, event]))

  expect(byId.standup).toEqual({
    id: 'standup',
    uid: 'standup@google.com',
    title: 'Standup',
    start: { time: '2026-03-02T10:00:00', zone },
    end: { time: '2026-03-02T10:15:00', zone },
    status: 'confirmed',
    etag: '"m1"',
    recurrence: { rule: 'FREQ=WEEKLY;BYDAY=MO', exdates: [{ time: '2026-03-09T10:00:00', zone }] },
  })
  expect(byId[moved.id]).toMatchObject({
    series: 'standup',
    original: { time: '2026-03-16T10:00:00', zone },
    start: { time: '2026-03-16T11:00:00', zone },
    end: { time: '2026-03-16T11:15:00', zone },
  })
  expect(byId['standup_20260323T090000Z']).toMatchObject({ status: 'cancelled', series: 'standup', original: { time: '2026-03-23T10:00:00', zone } })
  expect(byId.trip).toMatchObject({ start: { date: '2026-03-05' }, end: { date: '2026-03-07' }, free: true })
  expect(byId.review).toEqual({
    id: 'review',
    uid: 'review@google.com',
    title: 'Design review',
    start: { time: '2026-03-04T14:00:00', zone },
    end: { time: '2026-03-04T15:00:00', zone },
    status: 'confirmed',
    etag: '"r1"',
    location: 'Room 4',
    notes: 'Bring the mockups',
    organizer: { email: 'bo@example.com', name: 'Bo' },
    attendees: [
      { email: 'bo@example.com', name: 'Bo', response: 'accepted' },
      { email: 'me@example.com', response: 'needs-action' },
      { email: 'kai@example.com', response: 'tentative', optional: true },
    ],
    response: 'needs-action',
    reminders: [10],
    sequence: 2,
  })
})

const calendarList = {
  items: [
    primary,
    { id: 'team@group.calendar.google.com', summary: 'Team', summaryOverride: 'My team', timeZone: 'UTC', accessRole: 'writer' },
    { id: 'en.german#holiday@group.v.calendar.google.com', summary: 'Holidays', timeZone: 'Europe/Berlin', accessRole: 'reader' },
    { id: 'boss@example.com', summary: 'Boss', timeZone: 'Europe/Berlin', accessRole: 'freeBusyReader' },
    { id: 'hidden@example.com', summary: 'Hidden', timeZone: 'UTC', accessRole: 'owner', hidden: true },
  ],
}

test('calendars carry what the account may do with them', async () => {
  const source = sourceFor(() => calendarList)
  expect(await source.calendars(signal)).toEqual([
    { key: 'me@example.com', name: 'me@example.com', zone, color: '#9fe1e7', email: 'me@example.com', capabilities: ['read', 'write', 'invite', 'freebusy'], primary: true },
    { key: 'team@group.calendar.google.com', name: 'My team', zone: 'UTC', capabilities: ['read', 'write', 'invite', 'freebusy'], primary: false },
    { key: 'en.german#holiday@group.v.calendar.google.com', name: 'Holidays', zone, capabilities: ['read', 'freebusy'], primary: false },
    { key: 'boss@example.com', name: 'Boss', zone, capabilities: ['freebusy'], primary: false },
  ])
})

test('a read-only account can only read its calendars', async () => {
  const source = sourceFor(() => calendarList, true)
  const found = await source.calendars(signal)
  expect(found.map(one => one.capabilities)).toEqual([['read', 'freebusy'], ['read', 'freebusy'], ['read', 'freebusy'], ['freebusy']])
})

const saved = { ...review, id: 'new', etag: '"n1"', iCalUID: 'new@google.com', summary: 'Lunch' }

test('edits tell guests only when the change was approved to be sent', async () => {
  const source = sourceFor(({ method, path }) => {
    if (method === 'DELETE') return path.endsWith('gone') ? failure(410, 'Resource has been deleted') : undefined
    if (path.endsWith('stale')) return new Response(null, { status: 412 })
    return saved
  })
  const lunch = { uid: 'x', title: 'Lunch', start: { time: '2026-03-10T12:00:00', zone }, end: { time: '2026-03-10T13:00:00', zone }, status: 'confirmed' as const }
  expect(await source.create!(calendar, lunch, false)).toMatchObject({ id: 'new', etag: '"n1"', title: 'Lunch' })
  const master = { ...lunch, id: 'standup', etag: '"m1"', recurrence: { rule: 'FREQ=WEEKLY;BYDAY=MO', exdates: [{ time: '2026-03-09T10:00:00', zone }] } }
  await source.update!(calendar, master, true)
  await source.remove!(calendar, { ...lunch, id: 'review', etag: '"r1"' }, false)
  await source.remove!(calendar, { ...lunch, id: 'gone' }, true)
  await source.respond!(calendar, { ...lunch, id: 'review' }, 'accepted', true)
  await expect(source.update!(calendar, { ...lunch, id: 'stale', etag: '"old"' }, false)).rejects.toThrow('changed in Google Calendar')

  const [created, updated, removed, , answered] = google.seen
  expect(created).toEqual({
    method: 'POST',
    path: 'calendars/me@example.com/events',
    query: { sendUpdates: 'none' },
    body: {
      summary: 'Lunch',
      description: null,
      location: null,
      start: { dateTime: '2026-03-10T12:00:00', timeZone: zone },
      end: { dateTime: '2026-03-10T13:00:00', timeZone: zone },
      status: 'confirmed',
      transparency: 'opaque',
      attendees: [],
      reminders: { useDefault: true },
      recurrence: null,
    },
  })
  expect(updated).toMatchObject({ method: 'PATCH', path: 'calendars/me@example.com/events/standup', query: { sendUpdates: 'all' }, etag: '"m1"' })
  expect(updated!.body!.recurrence).toEqual(['RRULE:FREQ=WEEKLY;BYDAY=MO', 'EXDATE;TZID=Europe/Berlin:20260309T100000'])
  expect(removed).toEqual({ method: 'DELETE', path: 'calendars/me@example.com/events/review', query: { sendUpdates: 'none' }, etag: '"r1"' })
  expect(answered).toEqual({
    method: 'PATCH',
    path: 'calendars/me@example.com/events/review',
    query: { sendUpdates: 'all' },
    body: { attendeesOmitted: true, attendees: [{ email: 'me@example.com', responseStatus: 'accepted' }] },
  })
})

test('the first edit of one occurrence patches the instance Google keeps for it', async () => {
  const instance = { ...standup, id: 'standup_20260330T080000Z', etag: '"i1"', recurringEventId: 'standup', originalStartTime: { dateTime: '2026-03-30T10:00:00+02:00' } }
  const source = sourceFor(({ method }) =>
    method === 'GET' ? { timeZone: zone, items: [instance] } : { ...instance, summary: 'Standup moved', start: { dateTime: '2026-03-30T12:00:00+02:00' }, end: { dateTime: '2026-03-30T12:15:00+02:00' } },
  )
  const original = { time: '2026-03-30T10:00:00', zone }
  const edit = { uid: 'standup@google.com', title: 'Standup moved', start: { time: '2026-03-30T12:00:00', zone }, end: { time: '2026-03-30T12:15:00', zone }, status: 'confirmed' as const, series: 'standup', original }
  expect(await source.create!(calendar, edit, false)).toMatchObject({ id: instance.id, series: 'standup', original, start: { time: '2026-03-30T12:00:00', zone } })
  const [lookup, patch] = google.seen
  expect(lookup).toMatchObject({ method: 'GET', path: 'calendars/me@example.com/events/standup/instances', query: { originalStart: '2026-03-30T08:00:00.000Z' } })
  expect(patch).toMatchObject({ method: 'PATCH', path: `calendars/me@example.com/events/${instance.id}`, query: { sendUpdates: 'none' }, etag: '"i1"' })
  expect(patch!.body).not.toHaveProperty('recurrence')
})

test('free/busy asks Google for the busy times of other people', async () => {
  const source = sourceFor(() => ({ calendars: { 'bo@example.com': { busy: [{ start: '2026-03-02T09:00:00Z', end: '2026-03-02T10:00:00Z' }] }, 'nobody@example.com': { errors: [{ reason: 'notFound' }] } } }))
  const range = { from: Date.parse('2026-03-02T00:00Z'), to: Date.parse('2026-03-03T00:00Z') }
  expect(await source.freeBusy!(['bo@example.com', 'nobody@example.com'], range, signal)).toEqual({
    'bo@example.com': [{ from: Date.parse('2026-03-02T09:00Z'), to: Date.parse('2026-03-02T10:00Z') }],
    'nobody@example.com': [],
  })
  expect(google.seen[0]).toMatchObject({
    method: 'POST',
    path: 'freeBusy',
    body: { timeMin: '2026-03-02T00:00:00.000Z', timeMax: '2026-03-03T00:00:00.000Z', items: [{ id: 'bo@example.com' }, { id: 'nobody@example.com' }] },
  })
})
