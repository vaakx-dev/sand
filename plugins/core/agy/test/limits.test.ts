import { expect, test } from 'bun:test'
import { limitsOf } from '../src/limits'

test('the /usage table becomes one limit window per model group and period, and other lines are skipped', () => {
  const printed = [
    'Gemini Models\tWeekly Limit Remaining\t40%\t2030-01-08T00:00:00Z',
    'Gemini Models\tFive Hour Limit Remaining\t100%\tnot a date',
    'Gemini 9 Sample\tGemini 9 Sample Weekly Limit\t75%\t2030-01-08T00:00:00Z',
    'some log line',
  ].join('\n')

  expect(limitsOf(printed)?.windows.map(({ label, used, resetsAt }) => [label, used, resetsAt])).toEqual([
    ['Weekly · Gemini', 0.6, Date.UTC(2030, 0, 8)],
    ['5-hour · Gemini', 0, undefined],
    ['Weekly · Gemini 9 Sample', 0.25, Date.UTC(2030, 0, 8)],
  ])
  expect(limitsOf('nothing here')).toBeUndefined()
})
