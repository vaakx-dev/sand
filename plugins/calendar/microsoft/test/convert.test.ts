import { expect, test } from 'bun:test'
import { eventOf } from '../src/events'
import type { Pattern, Repeat, Span } from '../src/graph'
import { repeatBody, ruleOf } from '../src/recurrence'
import { ianaZone, windowsZone } from '../src/zones'
import { item } from './fake'

const zone = 'Europe/Berlin'

const start = { time: '2026-03-10T09:00:00', zone }

const blank: Omit<Pattern, 'type' | 'interval'> = { month: 0, dayOfMonth: 0, daysOfWeek: [], firstDayOfWeek: 'sunday', index: 'first' }

const noEnd: Span = { type: 'noEnd', startDate: '2026-03-10', endDate: '0001-01-01', numberOfOccurrences: 0, recurrenceTimeZone: 'W. Europe Standard Time' }

const cases: [string, Repeat, string, Partial<Repeat['pattern']>][] = [
  ['a daily pattern', { pattern: { ...blank, type: 'daily', interval: 2 }, range: noEnd }, 'FREQ=DAILY;INTERVAL=2', {}],
  [
    'a weekly pattern',
    { pattern: { ...blank, type: 'weekly', interval: 2, daysOfWeek: ['monday', 'wednesday'] }, range: { ...noEnd, type: 'numbered', numberOfOccurrences: 10 } },
    'FREQ=WEEKLY;INTERVAL=2;COUNT=10;BYDAY=MO,WE;WKST=SU',
    { daysOfWeek: ['monday', 'wednesday'], firstDayOfWeek: 'sunday' },
  ],
  [
    'a day of the month',
    { pattern: { ...blank, type: 'absoluteMonthly', interval: 1, dayOfMonth: 10 }, range: { ...noEnd, type: 'endDate', endDate: '2026-12-10' } },
    'FREQ=MONTHLY;UNTIL=20261210T080000Z;BYMONTHDAY=10',
    { dayOfMonth: 10 },
  ],
  [
    'a weekday of the month',
    { pattern: { ...blank, type: 'relativeMonthly', interval: 1, daysOfWeek: ['tuesday'], index: 'second' }, range: noEnd },
    'FREQ=MONTHLY;BYSETPOS=2;BYDAY=TU',
    { daysOfWeek: ['tuesday'], index: 'second' },
  ],
  [
    'a date of the year',
    { pattern: { ...blank, type: 'absoluteYearly', interval: 1, month: 3, dayOfMonth: 10 }, range: noEnd },
    'FREQ=YEARLY;BYMONTHDAY=10;BYMONTH=3',
    { month: 3, dayOfMonth: 10 },
  ],
  [
    'a weekday of the year',
    { pattern: { ...blank, type: 'relativeYearly', interval: 1, month: 11, daysOfWeek: ['friday'], index: 'last' }, range: noEnd },
    'FREQ=YEARLY;BYMONTH=11;BYSETPOS=-1;BYDAY=FR',
    { month: 11, daysOfWeek: ['friday'], index: 'last' },
  ],
]

test.each(cases)('%s becomes an RRULE and back', (_, repeat, rule, fields) => {
  expect(ruleOf(repeat, start)).toBe(rule)
  const { pattern, range } = repeatBody({ rule }, start, 'UTC')
  expect(pattern).toEqual({ type: repeat.pattern.type, interval: repeat.pattern.interval, ...fields })
  const ends = { noEnd: {}, numbered: { numberOfOccurrences: repeat.range.numberOfOccurrences }, endDate: { endDate: repeat.range.endDate } }[repeat.range.type]
  expect(range).toEqual({ type: repeat.range.type, startDate: '2026-03-10', recurrenceTimeZone: 'W. Europe Standard Time', ...ends })
})

test('RRULEs written other ways map to the closest Outlook pattern', () => {
  expect(repeatBody({ rule: 'FREQ=MONTHLY;BYDAY=2TU' }, start, 'UTC').pattern).toEqual({ type: 'relativeMonthly', interval: 1, daysOfWeek: ['tuesday'], index: 'second' })
  expect(repeatBody({ rule: 'FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR' }, start, 'UTC').pattern).toMatchObject({ type: 'weekly', daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] })
  expect(repeatBody({ rule: 'FREQ=WEEKLY' }, start, 'UTC').pattern).toMatchObject({ type: 'weekly', daysOfWeek: ['tuesday'], firstDayOfWeek: 'monday' })
  expect(repeatBody({ rule: 'FREQ=WEEKLY;UNTIL=20260407T065959Z' }, start, 'UTC').range).toMatchObject({ type: 'endDate', endDate: '2026-04-06' })
  expect(repeatBody({ rule: 'FREQ=WEEKLY;UNTIL=20260407' }, { date: '2026-03-10' }, 'America/New_York').range).toEqual({
    type: 'endDate',
    startDate: '2026-03-10',
    endDate: '2026-04-07',
    recurrenceTimeZone: 'Eastern Standard Time',
  })
  expect(ruleOf({ pattern: { ...blank, type: 'daily', interval: 1 }, range: { ...noEnd, type: 'endDate', endDate: '2026-04-07' } }, { date: '2026-03-10' })).toBe('FREQ=DAILY;UNTIL=20260407')
  expect(() => repeatBody({ rule: 'FREQ=HOURLY' }, start, 'UTC')).toThrow(/Outlook can't repeat/)
  expect(() => repeatBody({ rule: 'FREQ=MONTHLY;BYMONTHDAY=1,15' }, start, 'UTC')).toThrow(/Outlook can't repeat/)
  expect(() => repeatBody({ rule: 'FREQ=DAILY', rdates: [start] }, start, 'UTC')).toThrow(/extra dates/)
})

test('Windows time zone names map to IANA zones and back', () => {
  expect(ianaZone('W. Europe Standard Time')).toBe('Europe/Berlin')
  expect(ianaZone('Pacific Standard Time')).toBe('America/Los_Angeles')
  expect(ianaZone('tzone://Microsoft/Utc')).toBe('UTC')
  expect(ianaZone('Europe/Paris')).toBe('Europe/Paris')
  expect(ianaZone('Customized Time Zone')).toBeUndefined()
  expect(windowsZone('Europe/Amsterdam')).toBe('W. Europe Standard Time')
  expect(windowsZone('Asia/Calcutta')).toBe('India Standard Time')
  expect(windowsZone('Asia/Kolkata')).toBe('India Standard Time')
  expect(windowsZone('UTC')).toBe('UTC')
})

test("events take their own zone, and all-day events keep their dates whichever zone Graph answers in", () => {
  const meeting = item({ id: 'a', start: { dateTime: '2026-07-01T07:00:00.0000000', timeZone: 'UTC' }, end: { dateTime: '2026-07-01T08:00:00.0000000', timeZone: 'UTC' } })
  expect(eventOf(meeting)).toMatchObject({ start: { time: '2026-07-01T09:00:00', zone }, end: { time: '2026-07-01T10:00:00', zone }, reminders: [15] })
  const floating = item({ id: 'b', isAllDay: true, start: { dateTime: '2026-07-01T00:00:00.0000000', timeZone: 'UTC' }, end: { dateTime: '2026-07-02T00:00:00.0000000', timeZone: 'UTC' } })
  expect(eventOf({ ...floating, originalStartTimeZone: 'Eastern Standard Time' })).toMatchObject({ start: { date: '2026-07-01' }, end: { date: '2026-07-02' } })
  const shifted = item({ id: 'c', isAllDay: true, start: { dateTime: '2026-06-30T22:00:00.0000000', timeZone: 'UTC' }, end: { dateTime: '2026-07-01T22:00:00.0000000', timeZone: 'UTC' } })
  expect(eventOf(shifted)).toMatchObject({ start: { date: '2026-07-01' }, end: { date: '2026-07-02' } })
})
