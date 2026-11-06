export interface Seen {
  method: string
  path: string
  query: Record<string, string>
  body?: Record<string, unknown>
  etag?: string
}

export type Answer = (seen: Seen) => unknown

export const fakeGoogle = (answer: Answer) => {
  const seen: Seen[] = []
  const server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    async fetch(request) {
      const url = new URL(request.url)
      const text = await request.text()
      const one: Seen = {
        method: request.method,
        path: decodeURIComponent(url.pathname.replace('/calendar/v3/', '')),
        query: Object.fromEntries(url.searchParams),
        ...(text && { body: JSON.parse(text) }),
        ...(request.headers.has('if-match') && { etag: request.headers.get('if-match') ?? '' }),
      }
      seen.push(one)
      const reply = answer(one)
      if (reply instanceof Response) return reply
      return reply === undefined ? new Response(null, { status: 204 }) : Response.json(reply)
    },
  })
  return { api: `http://127.0.0.1:${server.port}/calendar/v3`, seen, stop: () => server.stop(true) }
}

export const failure = (status: number, message: string) => Response.json({ error: { code: status, message } }, { status })

const berlin = (time: string) => ({ dateTime: `${time}+01:00`, timeZone: 'Europe/Berlin' })

export const standup = {
  id: 'standup',
  etag: '"m1"',
  status: 'confirmed',
  iCalUID: 'standup@google.com',
  summary: 'Standup',
  start: berlin('2026-03-02T10:00:00'),
  end: berlin('2026-03-02T10:15:00'),
  recurrence: ['RRULE:FREQ=WEEKLY;BYDAY=MO', 'EXDATE;TZID=Europe/Berlin:20260309T100000'],
  reminders: { useDefault: true },
}

export const moved = {
  id: 'standup_20260316T090000Z',
  etag: '"x1"',
  status: 'confirmed',
  iCalUID: 'standup@google.com',
  summary: 'Standup (late)',
  recurringEventId: 'standup',
  originalStartTime: berlin('2026-03-16T10:00:00'),
  start: berlin('2026-03-16T11:00:00'),
  end: { dateTime: '2026-03-16T10:15:00Z' },
}

export const skipped = {
  id: 'standup_20260323T090000Z',
  etag: '"x2"',
  status: 'cancelled',
  recurringEventId: 'standup',
  originalStartTime: berlin('2026-03-23T10:00:00'),
}

export const trip = { id: 'trip', etag: '"t1"', status: 'confirmed', iCalUID: 'trip@google.com', summary: 'Trip', start: { date: '2026-03-05' }, end: { date: '2026-03-07' }, transparency: 'transparent' }

export const review = {
  id: 'review',
  etag: '"r1"',
  status: 'confirmed',
  iCalUID: 'review@google.com',
  summary: 'Design review',
  location: 'Room 4',
  description: 'Bring the mockups',
  start: { dateTime: '2026-03-04T13:00:00Z' },
  end: { dateTime: '2026-03-04T14:00:00Z' },
  organizer: { email: 'bo@example.com', displayName: 'Bo' },
  attendees: [
    { email: 'bo@example.com', displayName: 'Bo', organizer: true, responseStatus: 'accepted' },
    { email: 'me@example.com', self: true, responseStatus: 'needsAction' },
    { email: 'kai@example.com', responseStatus: 'tentative', optional: true },
    { email: 'room4@resource.calendar.google.com', resource: true, responseStatus: 'accepted' },
  ],
  reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 10 }] },
  sequence: 2,
}

export const primary = { id: 'me@example.com', summary: 'me@example.com', timeZone: 'Europe/Berlin', backgroundColor: '#9fe1e7', accessRole: 'owner', primary: true }

export const events = (seen: Seen) => {
  const { syncToken, pageToken } = seen.query
  if (syncToken === 's2') return failure(410, 'Sync token is no longer valid, a full sync is required.')
  if (syncToken === 's1')
    return { timeZone: 'Europe/Berlin', items: [{ id: 'trip', etag: '"t2"', status: 'cancelled' }, { id: 'old', etag: '"o2"', status: 'cancelled' }, { ...skipped, id: 'old_1', recurringEventId: 'old' }], nextSyncToken: 's2' }
  if (pageToken === 'p2') return { timeZone: 'Europe/Berlin', items: [moved, skipped, trip], nextSyncToken: 's1' }
  return { timeZone: 'Europe/Berlin', items: [standup, review], nextPageToken: 'p2' }
}
