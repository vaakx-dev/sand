import { calendarName, readCalendar, updateCalendar } from '@sand/ical'
import { expect, test } from 'bun:test'

const resource = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'PRODID:-//Apple Inc.//iCloud//EN',
  'X-WR-CALNAME:Work',
  'BEGIN:VTIMEZONE',
  'TZID:/mozilla.org/20050126_1/Europe/Berlin',
  'END:VTIMEZONE',
  'BEGIN:VEVENT',
  'UID:review@example.com',
  'DTSTART;TZID=/mozilla.org/20050126_1/Europe/Berlin:20260325T140000',
  'DTEND;TZID=/mozilla.org/20050126_1/Europe/Berlin:20260325T150000',
  'RRULE:FREQ=WEEKLY;COUNT=3',
  'SUMMARY:Design review',
  'URL:https://example.com/review',
  'X-APPLE-TRAVEL-ADVISORY-BEHAVIOR:AUTOMATIC',
  'ORGANIZER;CN=Bo;SCHEDULE-STATUS=1.2:mailto:bo@example.com',
  'ATTENDEE;CN=Me;CUTYPE=INDIVIDUAL;ROLE=CHAIR;RSVP=TRUE;PARTSTAT=NEEDS-ACTION:mailto:me@example.com',
  'ATTENDEE;PARTSTAT=ACCEPTED;ROLE=OPT-PARTICIPANT:mailto:cy@example.com',
  'BEGIN:VALARM',
  'ACTION:AUDIO',
  'X-WR-ALARMUID:1',
  'TRIGGER:-PT15M',
  'END:VALARM',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:review@example.com',
  'RECURRENCE-ID;TZID=/mozilla.org/20050126_1/Europe/Berlin:20260401T140000',
  'DTSTART;TZID=/mozilla.org/20050126_1/Europe/Berlin:20260401T160000',
  'DTEND;TZID=/mozilla.org/20050126_1/Europe/Berlin:20260401T170000',
  'SUMMARY:Design review (late)',
  'X-KEPT:override',
  'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n')

test('rewriting a resource keeps what sand does not model and changes what it does', () => {
  const [master, moved] = readCalendar(resource, 'UTC')
  const answered = { ...master!, attendees: master!.attendees!.map(guest => (guest.email === 'me@example.com' ? { ...guest, response: 'accepted' as const } : guest)) }
  const ics = updateCalendar(resource, [answered, { ...moved!, title: 'Design review (later)' }], { stamp: Date.UTC(2026, 2, 20), zone: 'UTC' })

  expect(readCalendar(ics, 'UTC')).toEqual([
    { ...answered, start: { time: '2026-03-25T14:00:00', zone: 'Europe/Berlin' } },
    { ...moved!, title: 'Design review (later)' },
  ])
  const lines = ics.replace(/\r\n /g, '').split('\r\n')
  expect(lines).toContain('PRODID:-//Apple Inc.//iCloud//EN')
  expect(lines).toContain('URL:https://example.com/review')
  expect(lines).toContain('X-APPLE-TRAVEL-ADVISORY-BEHAVIOR:AUTOMATIC')
  expect(lines).toContain('X-KEPT:override')
  expect(lines).toContain('X-WR-ALARMUID:1')
  expect(lines).toContain('ORGANIZER;CN=Bo;SCHEDULE-STATUS=1.2:mailto:bo@example.com')
  expect(lines).toContain('ATTENDEE;CN=Me;CUTYPE=INDIVIDUAL;ROLE=CHAIR;RSVP=TRUE;PARTSTAT=ACCEPTED:mailto:me@example.com')
  expect(lines).toContain('ATTENDEE;PARTSTAT=ACCEPTED;ROLE=OPT-PARTICIPANT:mailto:cy@example.com')
  expect(lines).toContain('TZID:Europe/Berlin')
  expect(lines).not.toContain('TZID:/mozilla.org/20050126_1/Europe/Berlin')
})

test('events left out of a rewrite are dropped and changed reminders replace the old alarms', () => {
  const [master] = readCalendar(resource, 'UTC')
  const ics = updateCalendar(resource, [{ ...master!, reminders: [30] }], { stamp: Date.UTC(2026, 2, 20), zone: 'UTC' })
  expect(readCalendar(ics, 'UTC').map(event => [event.title, event.reminders])).toEqual([['Design review', [30]]])
  expect(ics).not.toContain('X-WR-ALARMUID')
  expect(ics).not.toContain('X-KEPT')
})

test('a calendar names itself with X-WR-CALNAME', () => {
  expect(calendarName(resource)).toBe('Work')
  expect(calendarName('BEGIN:VCALENDAR\r\nEND:VCALENDAR')).toBeUndefined()
})
