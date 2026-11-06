import { calendarAgenda, calendarCreate, calendarList, type Occurrence } from '@sand/calendar/contract'
import { connections, type Account, type Connections, type Kind } from '@sand/connections/contract'
import { startSand, type Sand } from '@sand/harness'
import { afterEach, expect, test } from 'bun:test'
import { googleCalendar } from '../src/index'
import { events, fakeGoogle, primary } from './fake'

let sand: Sand
let google: ReturnType<typeof fakeGoogle>

afterEach(async () => {
  await sand.stop()
  google.stop()
})

const zone = 'Europe/Berlin'

const account: Account = { id: 'google-1', kind: 'google-calendar', name: 'me@example.com', readOnly: false, added: 0 }

const fakeConnections = (kinds: Kind[]): Connections => ({
  kind(kind) {
    kinds.push(kind)
    return () => void kinds.splice(kinds.indexOf(kind), 1)
  },
  accounts: kind => (kind === account.kind ? [account] : []),
  fetch: (_, url, init) => fetch(url, init),
  values: () => ({}),
  async disconnect() {},
})

const until = async (ready: () => Promise<boolean>) => {
  for (let tries = 0; !(await ready()); tries++) {
    if (tries > 100) throw new Error('timed out')
    await Bun.sleep(20)
  }
}

test("Google calendars show up next to sand's own in the agenda", async () => {
  google = fakeGoogle(seen => {
    if (seen.path === 'users/me/calendarList') return { items: [primary] }
    if (seen.path === 'calendars/primary') return { id: 'me@example.com' }
    return events(seen)
  })
  sand = await startSand([{ id: 'fake', models: ['m'] }], { plugins: ['calendar/calendar', 'calendar/local'] })
  const kinds: Kind[] = []
  sand.app.provide(connections, fakeConnections(kinds))
  sand.app.plugin(googleCalendar({ api: google.api, authorize: `${google.api}/auth`, token: `${google.api}/token` }))
  await sand.app.settled()

  const [kind] = kinds
  expect(kind).toMatchObject({ id: 'google-calendar', label: 'Google Calendar', oauth: { params: { access_type: 'offline', prompt: 'consent' } } })
  expect(kind?.oauth?.client).toBeUndefined()
  expect(await kind!.oauth!.identify((url, init) => fetch(url, init), AbortSignal.timeout(1000))).toBe('me@example.com')

  const { ask } = sand
  const week = { from: Date.parse('2026-03-02T00:00Z'), to: Date.parse('2026-03-24T00:00Z'), zone }
  await until(async () => (await ask(calendarAgenda, week)).some(occurrence => occurrence.title === 'Standup (late)'))
  const own = (await ask(calendarList, {})).find(calendar => calendar.provider === 'sand')
  await ask(calendarCreate, { calendar: own!.id, event: { title: 'Dentist', start: { time: '2026-03-03T08:00:00', zone }, end: { time: '2026-03-03T09:00:00', zone } } })

  const agenda = (await ask(calendarAgenda, week)) as Occurrence[]
  expect(agenda.map(({ title, calendar, start }) => [title, calendar, start])).toEqual([
    ['Standup', 'google-1/me@example.com', { time: '2026-03-02T10:00:00', zone }],
    ['Dentist', own!.id, { time: '2026-03-03T08:00:00', zone }],
    ['Design review', 'google-1/me@example.com', { time: '2026-03-04T14:00:00', zone }],
    ['Trip', 'google-1/me@example.com', { date: '2026-03-05' }],
    ['Standup (late)', 'google-1/me@example.com', { time: '2026-03-16T11:00:00', zone }],
  ])
})
