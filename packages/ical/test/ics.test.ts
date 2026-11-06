import { readCalendar, writeCalendar, type Event } from '@sand/ical'
import { expect, test } from 'bun:test'

const events: Event[] = [
  {
    uid: 'standup@sand',
    title: 'Standup; daily, short',
    start: { time: '2026-03-23T09:00:00', zone: 'Europe/Berlin' },
    end: { time: '2026-03-23T09:15:00', zone: 'Europe/Berlin' },
    recurrence: {
      rule: 'FREQ=WEEKLY;UNTIL=20261231T225959Z;BYDAY=MO,WE,FR',
      exdates: [{ time: '2026-04-06T09:00:00', zone: 'Europe/Berlin' }],
      rdates: [{ time: '2026-04-11T09:00:00', zone: 'Europe/Berlin' }],
    },
    location: 'Room 4, second floor',
    notes: 'Bring\nnotes \\ questions',
    organizer: { email: 'bo@example.com', name: 'Bo Li' },
    attendees: [
      { email: 'ana@example.com', name: 'Ana: PM', response: 'accepted' },
      { email: 'cy@example.com', response: 'needs-action', optional: true },
    ],
    status: 'confirmed',
    reminders: [10, 1440],
    sequence: 2,
  },
  {
    uid: 'standup@sand',
    title: 'Standup (moved)',
    original: { time: '2026-03-25T09:00:00', zone: 'Europe/Berlin' },
    start: { time: '2026-03-25T11:00:00', zone: 'Europe/Berlin' },
    end: { time: '2026-03-25T11:15:00', zone: 'Europe/Berlin' },
    status: 'confirmed',
  },
  { uid: 'trip', title: 'Trip to Kyōto 京都 — a long title that has to fold across several lines in the file', start: { date: '2026-05-01' }, end: { date: '2026-05-04' }, status: 'tentative', free: true },
  { uid: 'call', title: 'Call', start: { time: '2026-05-02T15:00:00', zone: 'UTC' }, end: { time: '2026-05-02T15:30:00', zone: 'UTC' }, status: 'cancelled' },
]

test('events written to .ics read back the same', () => {
  const ics = writeCalendar(events, { name: 'Work', stamp: Date.UTC(2026, 0, 1) })
  expect(ics.split('\r\n').every(line => new TextEncoder().encode(line).length <= 75)).toBe(true)
  expect(ics).toContain('BEGIN:VTIMEZONE\r\nTZID:Europe/Berlin')
  expect(readCalendar(ics, 'America/New_York')).toEqual(events)
})

test('reads files from other apps: folded lines, vendor zone names, UTC exceptions, durations and alarms', () => {
  const ics = [
    'BEGIN:VCALENDAR',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    'UID:abc',
    'DTSTART;TZID=/mozilla.org/20050126_1/Europe/Berlin:20261102T090000',
    'DURATION:PT1H30M',
    'RRULE:FREQ=DAILY;COUNT=3',
    'EXDATE:20261103T080000Z',
    'SUMMARY:Planning with a very long summary that the other app folded',
    '  onto a second line',
    'ATTENDEE;CN="Ana, PM";PARTSTAT=TENTATIVE:MAILTO:ana@example.com',
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'END:VALARM',
    'END:VEVENT',
    'BEGIN:VEVENT',
    'UID:floating',
    'DTSTART:20261105T100000',
    'SUMMARY:Floating',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\n')
  expect(readCalendar(ics, 'Asia/Tokyo')).toEqual([
    {
      uid: 'abc',
      title: 'Planning with a very long summary that the other app folded onto a second line',
      start: { time: '2026-11-02T09:00:00', zone: 'Europe/Berlin' },
      end: { time: '2026-11-02T10:30:00', zone: 'Europe/Berlin' },
      recurrence: { rule: 'FREQ=DAILY;COUNT=3', exdates: [{ time: '2026-11-03T08:00:00', zone: 'UTC' }] },
      attendees: [{ email: 'ana@example.com', name: 'Ana, PM', response: 'tentative' }],
      reminders: [1440],
      status: 'confirmed',
    },
    {
      uid: 'floating',
      title: 'Floating',
      start: { time: '2026-11-05T10:00:00', zone: 'Asia/Tokyo' },
      end: { time: '2026-11-05T10:00:00', zone: 'Asia/Tokyo' },
      status: 'confirmed',
    },
  ])
})
