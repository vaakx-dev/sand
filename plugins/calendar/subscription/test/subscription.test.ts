import { calendarAgenda, calendarCreate, calendarList, calendars, type Occurrence } from '@sand/calendar/contract'
import { connections } from '@sand/connections/contract'
import { startSand, type Sand } from '@sand/harness'
import { afterEach, expect, test } from 'bun:test'
import { feedSource, linkOf } from '../src/feed'
import { account, fakeConnections } from './connections'

const zone = 'Europe/Berlin'
const signal = () => AbortSignal.timeout(5000)

const holidays = (...days: string[]) =>
  [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'X-WR-CALNAME:Team holidays',
    ...days.flatMap(day => ['BEGIN:VEVENT', `UID:${day}@holidays`, `DTSTART;VALUE=DATE:${day.replaceAll('-', '')}`, `SUMMARY:Holiday ${day}`, 'END:VEVENT']),
    'END:VCALENDAR',
  ].join('\r\n')

const fakeFeed = (withEtag = true) => {
  const asked: (string | null)[] = []
  let body = holidays('2026-03-25')
  const etag = () => `"${Bun.hash(body).toString(16)}"`
  const served = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    fetch(request) {
      asked.push(request.headers.get('if-none-match'))
      if (withEtag && request.headers.get('if-none-match') === etag()) return new Response(null, { status: 304 })
      return new Response(body, { headers: { 'content-type': 'text/calendar', ...(withEtag && { etag: etag() }) } })
    },
  })
  return {
    url: new URL('/team.ics', served.url),
    asked,
    change: (next: string) => {
      body = next
    },
    stop: () => void served.stop(true),
  }
}

let feed: ReturnType<typeof fakeFeed> | undefined
let sand: Sand | undefined

afterEach(async () => {
  await sand?.stop()
  feed?.stop()
  sand = undefined
  feed = undefined
})

const serve = (withEtag?: boolean) => (feed = fakeFeed(withEtag))

test('webcal links are fetched over https and other schemes are turned down', () => {
  expect(linkOf('webcal://calendar.example.com/team.ics?token=secret').href).toBe('https://calendar.example.com/team.ics?token=secret')
  expect(() => linkOf('ftp://example.com/team.ics')).toThrow('https:// or webcal://')
})

test('a link is loaded whole, skipped while its ETag holds, and replaced when it changes', async () => {
  const served = serve()
  const source = feedSource(served.url, 'Team holidays')
  const first = await source.sync('link', undefined, signal())
  expect(first).toMatchObject({ reset: true, removed: [] })
  expect(first.events.map(event => [event.id, event.title])).toEqual([['2026-03-25@holidays', 'Holiday 2026-03-25']])

  expect(await source.sync('link', first.token, signal())).toEqual({ events: [], removed: [], token: first.token })
  expect(served.asked.at(-1)).toBe(JSON.parse(first.token).etag)

  served.change(holidays('2026-03-25', '2026-04-06'))
  const changed = await source.sync('link', first.token, signal())
  expect(changed.reset).toBe(true)
  expect(changed.events.map(event => event.id)).toEqual(['2026-03-25@holidays', '2026-04-06@holidays'])
})

test('without an ETag the content hash tells whether the calendar changed', async () => {
  const served = serve(false)
  const source = feedSource(served.url, 'Team holidays')
  const first = await source.sync('link', undefined, signal())
  expect(await source.sync('link', first.token, signal())).toEqual({ events: [], removed: [], token: first.token })
  served.change(holidays('2026-04-06'))
  expect((await source.sync('link', first.token, signal())).events.map(event => event.id)).toEqual(['2026-04-06@holidays'])
})

test("a subscribed calendar shows next to sand's own in the agenda and stays read-only", async () => {
  const served = serve()
  sand = await startSand([{ id: 'fake', models: ['m'] }], { plugins: ['calendar/calendar', 'calendar/local', 'calendar/subscription'] })
  const { ask, app } = sand
  const fake = fakeConnections([{ account: account('team', 'calendar-link', 'Team holidays'), values: { url: served.url.href } }])
  app.provide(connections, fake.service)
  await app.settled()
  expect(await fake.kinds.get('calendar-link')!.form!.check({ url: served.url.href }, signal())).toBe('Team holidays')
  await app.get(calendars)!.sync('team')

  const listed = await ask(calendarList, {})
  const own = listed.find(calendar => calendar.provider === 'sand')!
  expect(listed.find(calendar => calendar.provider === 'team')).toMatchObject({ id: 'team/link', name: 'Team holidays', capabilities: ['read'] })
  await ask(calendarCreate, { calendar: own.id, event: { title: 'Planning', start: { time: '2026-03-25T10:00', zone }, end: { time: '2026-03-25T11:00', zone } } })
  await expect(ask(calendarCreate, { calendar: 'team/link', event: { title: 'Nope', start: { date: '2026-03-26' }, end: { date: '2026-03-27' } } })).rejects.toThrow('read-only')

  const day = await ask(calendarAgenda, { from: Date.parse('2026-03-24T23:00Z'), to: Date.parse('2026-03-25T23:00Z'), zone })
  expect(day.map(({ title, calendar }: Occurrence) => [title, calendar])).toEqual([
    ['Holiday 2026-03-25', 'team/link'],
    ['Planning', own.id],
  ])
})
