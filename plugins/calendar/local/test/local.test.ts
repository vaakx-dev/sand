import { calendarAgenda, calendarRespond, type Occurrence } from '@sand/calendar/contract'
import { calendarExport, calendarFeed, calendarImport } from '@sand/calendar-local/contract'
import { startSand, type Sand } from '@sand/harness'
import { readCalendar } from '@sand/ical'
import { afterEach, expect, test } from 'bun:test'

let sand: Sand

afterEach(() => sand.stop())

const zone = 'Europe/Berlin'

test('a meeting imported from .ics can be answered, exported again and served as a feed', async () => {
  sand = await startSand([{ id: 'fake', models: ['m'] }], { plugins: ['calendar/calendar', 'calendar/local'] })
  const { ask } = sand
  const ics = [
    'BEGIN:VCALENDAR',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    'UID:review@example.com',
    'DTSTART;TZID=Europe/Berlin:20260325T140000',
    'DTEND;TZID=Europe/Berlin:20260325T150000',
    'SUMMARY:Design review',
    'ORGANIZER;CN=Bo:mailto:bo@example.com',
    'ATTENDEE;PARTSTAT=NEEDS-ACTION:mailto:me@example.com',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
  expect(await ask(calendarImport, { ics })).toBe(1)
  const [review] = (await ask(calendarAgenda, { from: Date.parse('2026-03-25T00:00Z'), to: Date.parse('2026-03-26T00:00Z'), zone })) as Occurrence[]
  expect(review).toMatchObject({ id: 'review@example.com', title: 'Design review', organizer: { email: 'bo@example.com', name: 'Bo' }, response: 'needs-action' })

  const answered = await ask(calendarRespond, { target: { calendar: review!.calendar, id: review!.id }, response: 'accepted' })
  expect(answered.response).toBe('accepted')

  const exported = readCalendar(await ask(calendarExport, { calendar: review!.calendar }), 'UTC')
  expect(exported).toEqual([expect.objectContaining({ uid: 'review@example.com', title: 'Design review', start: { time: '2026-03-25T14:00:00', zone } })])

  const path = await ask(calendarFeed, { calendar: review!.calendar })
  expect(await ask(calendarFeed, { calendar: review!.calendar })).toBe(path)
  expect(path).toMatch(/^\/calendar\/[\w-]{32}\.ics$/)
})
