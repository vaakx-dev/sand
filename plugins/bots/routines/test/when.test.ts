import { expect, test } from 'bun:test'
import { describe } from '../src/web/when'

const cron = (text: string) => describe({ kind: 'cron', cron: text, zone: 'UTC' })

test('describes common cron shapes in words', () => {
  expect(cron('0 9 * * *')).toBe('Daily 9:00')
  expect(cron('0 9 * * 1-5')).toBe('Weekdays 9:00')
  expect(cron('0 8 * * 1')).toBe('Mondays 8:00')
  expect(cron('30 16 * * 5')).toBe('Fridays 16:30')
  expect(cron('0 9 * * 1,3')).toBe('Mon, Wed 9:00')
  expect(cron('0 9 * * sun,sat')).toBe('Sat, Sun 9:00')
  expect(cron('0 9 * * 0-7')).toBe('Daily 9:00')
  expect(cron('0 9 1 * *')).toBe('Monthly on the 1st, 9:00')
  expect(cron('15 7 22 * *')).toBe('Monthly on the 22nd, 7:15')
  expect(cron('0 9 11 * *')).toBe('Monthly on the 11th, 9:00')
  expect(cron('0 * * * *')).toBe('Hourly')
  expect(cron('*/15 * * * *')).toBe('Every 15 minutes')
})

test('falls back for schedules it has no words for', () => {
  for (const text of ['0 9 * 1 *', '0 9 1 * 1', '0 9-17 * * *', '0 9 * * 5-1', '*/15 9 * * *', '0 9 * *', 'nonsense']) {
    expect(cron(text)).toBe('Custom schedule')
  }
})
