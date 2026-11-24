import { type AppCall, type AppOutput, UsageLimited } from '@sand/accounts/contract'
import { expect, test } from 'bun:test'
import { createReader } from '../src/session/stream'
import { usageLimits } from '../src/account/usage'

const reading = () => {
  const failed: unknown[] = []
  const calls: AppCall[] = []
  const output: AppOutput = {
    text() {},
    thinking() {},
    call: call => void calls.push(call),
    usage() {},
    context() {},
    pause() {},
    finish() {},
    fail: error => void failed.push(error),
    exit() {},
  }
  return { failed, calls, reader: createReader(output) }
}

const limited = { type: 'result', subtype: 'success', is_error: true, api_error_status: 429, result: 'You’ve hit your limit · resets 3:40pm' }

test('a turn Claude Code stopped at the usage limit fails as out of usage until the latest reset it reported', () => {
  const { failed, reader } = reading()
  reader.read({ type: 'rate_limit_event', rate_limit_info: { status: 'rejected', rateLimitType: 'five_hour', resetsAt: 1_900_000_000 } })
  reader.read({ type: 'rate_limit_event', rate_limit_info: { status: 'rejected', rateLimitType: 'seven_day', resetsAt: 1_900_003_600 } })
  reader.finish(limited)
  reader.finish({ type: 'result', subtype: 'success', is_error: true, result: 'API Error: 500' })

  expect(failed[0]).toBeInstanceOf(UsageLimited)
  expect(failed[0]).toMatchObject({ resetsAt: 1_900_003_600_000, message: limited.result })
  expect(failed[1]).not.toBeInstanceOf(UsageLimited)
})

test('sand runs the calls to its own tools, while Claude Code runs its tool search itself', () => {
  const { calls, reader } = reading()
  const search = { type: 'tool_use', id: 'toolu_search', name: 'ToolSearch', input: { query: 'select:calendar' } }
  const calendar = { type: 'tool_use', id: 'toolu_calendar', name: 'mcp__sand__calendar', input: { day: 'monday' } }

  reader.read({ type: 'assistant', message: { content: [search] } })
  reader.read({ type: 'assistant', message: { content: [{ type: 'text', text: 'Checking.' }, calendar] } })

  expect(calls).toEqual([{ id: 'toolu_calendar', name: 'calendar', input: { day: 'monday' } }])
})

test('the 5-hour window resets when Claude Code’s rate-limit events say, not at the hour the usage endpoint rounds to', () => {
  const { reader } = reading()
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
