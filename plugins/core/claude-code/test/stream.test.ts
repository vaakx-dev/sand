import { type AppOutput, UsageLimited } from '@sand/accounts/contract'
import { expect, test } from 'bun:test'
import { createReader } from '../src/session/stream'
import { usageLimits } from '../src/account/usage'

const failures = () => {
  const failed: unknown[] = []
  const windows: number[] = []
  const output: AppOutput = {
    text() {},
    thinking() {},
    call() {},
    usage() {},
    context: ({ window }) => void windows.push(window ?? 0),
    pause() {},
    finish() {},
    fail: error => void failed.push(error),
    exit() {},
  }
  return { failed, windows, reader: createReader(output) }
}

const limited = { type: 'result', subtype: 'success', is_error: true, api_error_status: 429, result: 'You’ve hit your limit · resets 3:40pm' }

test('a turn Claude Code stopped at the usage limit fails as out of usage until the latest reset it reported', () => {
  const { failed, reader } = failures()
  reader.read({ type: 'rate_limit_event', rate_limit_info: { status: 'rejected', rateLimitType: 'five_hour', resetsAt: 1_900_000_000 } })
  reader.read({ type: 'rate_limit_event', rate_limit_info: { status: 'rejected', rateLimitType: 'seven_day', resetsAt: 1_900_003_600 } })
  reader.finish(limited)
  reader.finish({ type: 'result', subtype: 'success', is_error: true, result: 'API Error: 500' })

  expect(failed[0]).toBeInstanceOf(UsageLimited)
  expect(failed[0]).toMatchObject({ resetsAt: 1_900_003_600_000, message: limited.result })
  expect(failed[1]).not.toBeInstanceOf(UsageLimited)
})

test('a Claude Code turn reports the context window of the model that answered, not of the other models it used', () => {
  const { windows, reader } = failures()
  reader.read({ type: 'stream_event', event: { type: 'message_start', message: { model: 'claude-big', usage: {} } } })
  reader.finish({
    type: 'result',
    subtype: 'success',
    is_error: false,
    modelUsage: { 'claude-small': { contextWindow: 200_000 }, 'claude-big': { contextWindow: 1_000_000 } },
  })

  expect(windows).toEqual([1_000_000])
})

test('the 5-hour window resets when Claude Code’s rate-limit events say, not at the hour the usage endpoint rounds to', () => {
  const { reader } = failures()
  reader.read({ type: 'rate_limit_event', rate_limit_info: { status: 'allowed', unifiedWindows: { five_hour: { utilization: 0.4, resetsAt: 1_900_001_820 }, seven_day: { utilization: 0.2, resetsAt: 1_900_300_000 } } } })
  const usage = {
    rate_limits: {
      limits: [
        { kind: 'session', group: 'session', percent: 40, resets_at: new Date(1_900_000_800_000).toISOString() },
        { kind: 'weekly_all', group: 'weekly', percent: 20, resets_at: new Date(1_900_299_600_000).toISOString() },
      ],
    },
  }

  expect(usageLimits(usage, reader.resets())?.windows.map(window => window.resetsAt)).toEqual([1_900_001_820_000, 1_900_300_000_000])
})
