import type { JobRun } from '@sand/bots/contract'
import { expect, test } from 'bun:test'
import { runRows } from '../src/web/jobs/runs'

const HOUR_MS = 3_600_000
const now = new Date('2026-11-17T08:05:00').getTime()

const run = (hoursAgo: number, outcome: JobRun['outcome'], summary = ''): JobRun => ({ entry: `run-${hoursAgo}`, at: now - hoursAgo * HOUR_MS, outcome, summary })

test('runs with nothing to do in a row fold into one line naming their days, and a lone one keeps its time', () => {
  const rows = runRows(
    [
      run(1, 'done', 'Fixed 2 failures'),
      run(72, 'nothing'),
      run(96, 'nothing'),
      run(120, 'needs', 'Asked about the runner'),
      run(130, 'nothing'),
    ],
    now,
  )

  expect(rows.map(({ text, tone }) => [text, tone])).toEqual([
    ['Fixed 2 failures', 'plain'],
    ['Nothing to do', 'quiet'],
    ['Asked about the runner', 'needs'],
    ['Nothing to do', 'quiet'],
  ])
  expect(rows[1]!.at.split(', ')).toHaveLength(2)
  expect(rows[3]!.at).toMatch(/\d:\d\d/)
})
