import { expect, test } from 'bun:test'
import { parseCron } from '../src/time/cron'
import { nextRun } from '../src/time/next'
import { localInstant } from '../src/time/zone'

const at = (iso: string) => Date.parse(iso)
const iso = (instant: number | undefined) => (instant === undefined ? undefined : new Date(instant).toISOString())
const cron = (expression: string, zone = 'UTC') => ({ kind: 'cron', cron: expression, zone }) as const

const runs = (expression: string, zone: string, from: string, count: number) => {
  const found: string[] = []
  let after = at(from)
  for (let index = 0; index < count; index++) {
    after = nextRun(cron(expression, zone), after)!
    found.push(iso(after)!)
  }
  return found
}

test('cron fields take numbers, names, ranges, lists and steps', () => {
  expect(runs('0 9 * * MON-FRI', 'UTC', '2026-11-06T10:00:00Z', 3)).toEqual(['2026-11-09T09:00:00.000Z', '2026-11-10T09:00:00.000Z', '2026-11-11T09:00:00.000Z'])
  expect(runs('*/20 8-9 * * *', 'UTC', '2026-11-06T09:30:00Z', 3)).toEqual(['2026-11-06T09:40:00.000Z', '2026-11-07T08:00:00.000Z', '2026-11-07T08:20:00.000Z'])
  expect(runs('0 0 1 jan,jul *', 'UTC', '2026-11-06T00:00:00Z', 2)).toEqual(['2027-01-01T00:00:00.000Z', '2027-07-01T00:00:00.000Z'])
  expect(runs('0 12 * * 7', 'UTC', '2026-11-06T00:00:00Z', 1)).toEqual(['2026-11-08T12:00:00.000Z'])
})

test('a restricted day of the month and day of the week match either, like cron', () => {
  expect(runs('0 9 10 * 5', 'UTC', '2026-11-01T00:00:00Z', 4)).toEqual([
    '2026-11-06T09:00:00.000Z',
    '2026-11-10T09:00:00.000Z',
    '2026-11-13T09:00:00.000Z',
    '2026-11-20T09:00:00.000Z',
  ])
})

test('the next run is strictly after the time asked about, and a one-off has none once it is past', () => {
  expect(iso(nextRun(cron('0 9 * * *'), at('2026-11-06T09:00:00Z')))).toBe('2026-11-07T09:00:00.000Z')
  expect(iso(nextRun(cron('0 9 * * *'), at('2026-11-06T08:59:59Z')))).toBe('2026-11-06T09:00:00.000Z')
  expect(nextRun({ kind: 'once', at: at('2026-11-06T09:00:00Z') }, at('2026-11-06T08:00:00Z'))).toBe(at('2026-11-06T09:00:00Z'))
  expect(nextRun({ kind: 'once', at: at('2026-11-06T09:00:00Z') }, at('2026-11-06T09:00:00Z'))).toBeUndefined()
})

test('cron runs on local time in its zone', () => {
  expect(runs('0 9 * * *', 'Europe/Berlin', '2026-11-06T12:00:00Z', 1)).toEqual(['2026-11-07T08:00:00.000Z'])
  expect(runs('0 9 * * *', 'America/New_York', '2026-11-06T12:00:00Z', 1)).toEqual(['2026-11-06T14:00:00.000Z'])
  expect(runs('0 9 * * *', 'Asia/Kolkata', '2026-11-06T12:00:00Z', 1)).toEqual(['2026-11-07T03:30:00.000Z'])
  expect(runs('0 9 * * *', 'Europe/Berlin', '2026-07-06T12:00:00Z', 1)).toEqual(['2026-07-07T07:00:00.000Z'])
})

test('a time the clocks skip in spring runs an hour on, and the day after is back to normal', () => {
  expect(runs('30 2 * * *', 'Europe/Berlin', '2026-03-28T12:00:00Z', 2)).toEqual(['2026-03-29T01:30:00.000Z', '2026-03-30T00:30:00.000Z'])
})

test('a time the clocks repeat in autumn runs once, at its first pass', () => {
  expect(runs('30 2 * * *', 'Europe/Berlin', '2026-10-24T12:00:00Z', 2)).toEqual(['2026-10-25T00:30:00.000Z', '2026-10-26T01:30:00.000Z'])
  expect(runs('0 * * * *', 'Europe/Berlin', '2026-10-24T23:30:00Z', 4)).toEqual([
    '2026-10-25T00:00:00.000Z',
    '2026-10-25T02:00:00.000Z',
    '2026-10-25T03:00:00.000Z',
    '2026-10-25T04:00:00.000Z',
  ])
})

test('a schedule that can never come due has no next run', () => {
  expect(nextRun(cron('0 0 30 2 *'), at('2026-11-06T00:00:00Z'))).toBeUndefined()
  expect(runs('0 0 29 2 *', 'UTC', '2026-11-06T00:00:00Z', 1)).toEqual(['2028-02-29T00:00:00.000Z'])
})

test('a malformed cron says what is wrong', () => {
  expect(() => parseCron('0 9 * *')).toThrow('five fields')
  expect(() => parseCron('61 9 * * *')).toThrow('"61" is not a valid minute')
  expect(() => parseCron('0 9 * * funday')).toThrow('"funday" is not a valid day of the week')
  expect(() => parseCron('0 17-9 * * *')).toThrow('runs backwards')
  expect(() => parseCron('*/0 * * * *')).toThrow('bad step')
})

test('a local time is read in its zone, and an impossible one is refused', () => {
  expect(iso(localInstant('2026-11-04 18:00', 'Europe/Berlin'))).toBe('2026-11-04T17:00:00.000Z')
  expect(iso(localInstant('2026-11-04T18:00', 'America/Los_Angeles'))).toBe('2026-11-05T02:00:00.000Z')
  expect(iso(localInstant('2026-03-29 02:30', 'Europe/Berlin'))).toBe('2026-03-29T01:30:00.000Z')
  expect(() => localInstant('2026-02-30 09:00', 'UTC')).toThrow('not a real date')
  expect(() => localInstant('tomorrow at 9', 'UTC')).toThrow('not a local time')
  expect(() => localInstant('2026-11-04 18:00', 'Mars/Olympus')).toThrow('not a time zone')
})
