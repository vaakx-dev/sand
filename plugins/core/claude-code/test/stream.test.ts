import { type AppCall, type AppOutput, ProviderTrouble, type Usage, UsageLimited } from '@sand/accounts/contract'
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
  return { failed, calls, output, reader: createReader(output) }
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

test('a 429 or overload Claude Code was not limited for is retried as provider trouble, unless its usage shows the plan spent', () => {
  const { failed, reader } = reading()
  const busy = { type: 'result', subtype: 'success', is_error: true, api_error_status: 429, result: 'API Error: 429 rate_limit_error' }
  reader.finish(busy)
  reader.finish(busy, { windows: [{ id: 'session', label: '5-hour', used: 1, resetsAt: 1_900_000_000_000 }] })
  reader.finish({ type: 'result', subtype: 'success', is_error: true, api_error_status: 529, result: 'API Error: 529 Overloaded' })

  expect(failed[0]).toBeInstanceOf(ProviderTrouble)
  expect(failed[1]).toMatchObject({ name: 'UsageLimited', resetsAt: 1_900_000_000_000 })
  expect(failed[2]).toBeInstanceOf(ProviderTrouble)
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

test('a step that makes several model requests bills them all, while its context is the last request’s', () => {
  const usage: Partial<Usage>[] = []
  const used: number[] = []
  const reader = createReader({ ...reading().output, usage: spent => void usage.push(spent), context: ({ used: tokens }) => void used.push(tokens ?? 0) })
  const request = (cacheRead: number) => {
    reader.read({ type: 'stream_event', event: { type: 'message_start', message: { usage: { input_tokens: 2, cache_read_input_tokens: cacheRead } } } })
    reader.read({ type: 'stream_event', event: { type: 'message_delta', delta: {}, usage: { input_tokens: 2, cache_read_input_tokens: cacheRead, cache_creation_input_tokens: 700, output_tokens: 298 } } })
  }

  request(133_000)
  request(134_000)
  request(135_000)

  expect(used.at(-1)).toBe(136_000)
  expect(usage.reduce((total, spent) => total + (spent.input ?? 0) + (spent.cacheRead ?? 0) + (spent.cacheWrite ?? 0) + (spent.output ?? 0), 0)).toBe(405_000)
})
