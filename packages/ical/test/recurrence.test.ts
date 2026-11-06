import { expand, parseRule, recur, spans, type Event } from '@sand/ical'
import { expect, test } from 'bun:test'

const far = Temporal.PlainDateTime.from('2100-01-01T00:00')

const dates = (rule: string, start: string, limit = 20) =>
  [...recur(parseRule(rule), Temporal.PlainDateTime.from(start), 'America/New_York', far)].slice(0, limit).map(plain => plain.toPlainDate().toString())

const range = (from: string, to: string) => ({ from: Date.parse(from), to: Date.parse(to) })

test('daily, weekly and monthly rules from RFC 5545', () => {
  expect(dates('FREQ=DAILY;COUNT=4', '1997-09-02T09:00')).toEqual(['1997-09-02', '1997-09-03', '1997-09-04', '1997-09-05'])
  expect(dates('FREQ=WEEKLY;UNTIL=19971007T000000Z;WKST=SU;BYDAY=TU,TH', '1997-09-02T09:00')).toEqual([
    '1997-09-02', '1997-09-04', '1997-09-09', '1997-09-11', '1997-09-16', '1997-09-18', '1997-09-23', '1997-09-25', '1997-09-30', '1997-10-02',
  ])
  expect(dates('FREQ=MONTHLY;COUNT=6;BYDAY=1FR', '1997-09-05T09:00')).toEqual(['1997-09-05', '1997-10-03', '1997-11-07', '1997-12-05', '1998-01-02', '1998-02-06'])
  expect(dates('FREQ=MONTHLY;COUNT=6;BYDAY=-2MO', '1997-09-22T09:00')).toEqual(['1997-09-22', '1997-10-20', '1997-11-17', '1997-12-22', '1998-01-19', '1998-02-16'])
  expect(dates('FREQ=MONTHLY;BYDAY=MO,TU,WE,TH,FR;BYSETPOS=-1', '1997-09-30T09:00', 5)).toEqual(['1997-09-30', '1997-10-31', '1997-11-28', '1997-12-31', '1998-01-30'])
  expect(dates('FREQ=MONTHLY;BYDAY=FR;BYMONTHDAY=13', '1998-02-13T09:00', 4)).toEqual(['1998-02-13', '1998-03-13', '1998-11-13', '1999-08-13'])
})

test('week start, week numbers, yearly rules and short months', () => {
  expect(dates('FREQ=WEEKLY;INTERVAL=2;COUNT=4;BYDAY=TU,SU;WKST=MO', '1997-08-05T09:00')).toEqual(['1997-08-05', '1997-08-10', '1997-08-19', '1997-08-24'])
  expect(dates('FREQ=WEEKLY;INTERVAL=2;COUNT=4;BYDAY=TU,SU;WKST=SU', '1997-08-05T09:00')).toEqual(['1997-08-05', '1997-08-17', '1997-08-19', '1997-08-31'])
  expect(dates('FREQ=YEARLY;BYWEEKNO=20;BYDAY=MO', '1997-05-12T09:00', 3)).toEqual(['1997-05-12', '1998-05-11', '1999-05-17'])
  expect(dates('FREQ=YEARLY;INTERVAL=4;BYMONTH=11;BYDAY=TU;BYMONTHDAY=2,3,4,5,6,7,8', '1996-11-05T09:00', 3)).toEqual(['1996-11-05', '2000-11-07', '2004-11-02'])
  expect(dates('FREQ=YEARLY;COUNT=3', '2024-02-29T09:00')).toEqual(['2024-02-29', '2028-02-29', '2032-02-29'])
  expect(dates('FREQ=MONTHLY;COUNT=4', '2026-01-31T09:00')).toEqual(['2026-01-31', '2026-03-31', '2026-05-31', '2026-07-31'])
  expect(dates('FREQ=YEARLY;BYMONTH=1;BYDAY=SU,MO', '2026-01-04T09:00', 3)).toEqual(['2026-01-04', '2026-01-05', '2026-01-11'])
})

test('hourly rules keep to the wall clock', () => {
  const times = [...recur(parseRule('FREQ=HOURLY;INTERVAL=4;BYHOUR=9,13,17;COUNT=5'), Temporal.PlainDateTime.from('2026-11-02T09:00'), 'UTC', far)]
  expect(times.map(plain => plain.toString())).toEqual(['2026-11-02T09:00:00', '2026-11-02T13:00:00', '2026-11-02T17:00:00', '2026-11-03T09:00:00', '2026-11-03T13:00:00'])
})

const standup: Event = {
  uid: 'standup',
  title: 'Standup',
  start: { time: '2026-03-23T09:00:00', zone: 'Europe/Berlin' },
  end: { time: '2026-03-23T09:15:00', zone: 'Europe/Berlin' },
  recurrence: { rule: 'FREQ=WEEKLY;BYDAY=MO', exdates: [{ time: '2026-04-06T07:00:00', zone: 'UTC' }] },
  status: 'confirmed',
}

test('a weekly meeting stays at nine local time across the spring change, and an EXDATE in another zone removes its day', () => {
  const found = spans(standup, range('2026-03-20T00:00Z', '2026-04-14T00:00Z'), 'America/New_York')
  expect(found.map(span => new Date(span.from).toISOString())).toEqual(['2026-03-23T08:00:00.000Z', '2026-03-30T07:00:00.000Z', '2026-04-13T07:00:00.000Z'])
  expect(found.map(span => span.start)).toEqual([
    { time: '2026-03-23T09:00:00', zone: 'Europe/Berlin' },
    { time: '2026-03-30T09:00:00', zone: 'Europe/Berlin' },
    { time: '2026-04-13T09:00:00', zone: 'Europe/Berlin' },
  ])
  expect(found.every(span => span.to - span.from === 15 * 60_000)).toBe(true)
})

test('a time skipped by the clock change moves forward, and a repeated one takes the first', () => {
  const night = (time: string, zone: string) => spans({ ...standup, start: { time, zone }, end: { time, zone }, recurrence: undefined }, range('2026-01-01T00:00Z', '2027-01-01T00:00Z'), zone)[0]!
  expect(new Date(night('2026-03-08T02:30:00', 'America/New_York').from).toISOString()).toBe('2026-03-08T07:30:00.000Z')
  expect(new Date(night('2026-11-01T01:30:00', 'America/New_York').from).toISOString()).toBe('2026-11-01T05:30:00.000Z')
})

test('all-day events span whole days in the viewer zone', () => {
  const holiday: Event = { uid: 'h', title: 'Holiday', start: { date: '2026-12-24' }, end: { date: '2026-12-27' }, status: 'confirmed', recurrence: { rule: 'FREQ=YEARLY;COUNT=2' } }
  const [first, second] = spans(holiday, range('2026-01-01T00:00Z', '2028-01-01T00:00Z'), 'Asia/Tokyo')
  expect(new Date(first!.from).toISOString()).toBe('2026-12-23T15:00:00.000Z')
  expect(first!.to - first!.from).toBe(3 * 86_400_000)
  expect(second!.start).toEqual({ date: '2027-12-24' })
})

test('an override moves one occurrence and a cancelled one removes it', () => {
  const moved: Event = {
    ...standup,
    recurrence: undefined,
    original: { time: '2026-03-30T09:00:00', zone: 'Europe/Berlin' },
    start: { time: '2026-03-31T10:00:00', zone: 'Europe/Berlin' },
    end: { time: '2026-03-31T10:30:00', zone: 'Europe/Berlin' },
  }
  const dropped: Event = { ...moved, original: { time: '2026-04-13T09:00:00', zone: 'Europe/Berlin' }, status: 'cancelled' }
  const found = expand(standup, [moved, dropped], range('2026-03-20T00:00Z', '2026-04-14T00:00Z'), 'Europe/Berlin')
  expect(found.map(({ span, original }) => [span.start, original])).toEqual([
    [{ time: '2026-03-23T09:00:00', zone: 'Europe/Berlin' }, { time: '2026-03-23T09:00:00', zone: 'Europe/Berlin' }],
    [{ time: '2026-03-31T10:00:00', zone: 'Europe/Berlin' }, { time: '2026-03-30T09:00:00', zone: 'Europe/Berlin' }],
  ])
})
