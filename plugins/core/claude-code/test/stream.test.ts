import { type AppOutput, UsageLimited } from '@sand/accounts/contract'
import { expect, test } from 'bun:test'
import { createReader } from '../src/session/stream'

const failures = () => {
  const failed: unknown[] = []
  const output: AppOutput = {
    text() {},
    thinking() {},
    call() {},
    usage() {},
    pause() {},
    finish() {},
    fail: error => void failed.push(error),
    exit() {},
  }
  return { failed, reader: createReader(output) }
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
