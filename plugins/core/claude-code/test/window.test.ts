import type { ContextReport } from '@sand/accounts/contract'
import type { Json } from '@sand/app-plan'
import { expect, test } from 'bun:test'
import { reportWindow } from '../src/session/window'

const reported = async (answer: () => Promise<Json>) => {
  const reports: ContextReport[] = []
  await reportWindow({ request: answer }, { context: report => void reports.push(report) })
  return reports
}

test('a Claude Code session reports the full window of its model, not the smaller one its own auto-compact stops at', async () => {
  const usage = { totalTokens: 2_400, maxTokens: 967_000, rawMaxTokens: 1_000_000 }

  expect(await reported(async () => usage)).toEqual([{ window: 1_000_000 }])
})

test('a Claude Code release that cannot tell its context usage leaves the window unknown', async () => {
  expect(await reported(() => Promise.reject(new Error('Unknown request subtype')))).toEqual([])
})
