import type { PastTurn, UsageRecord } from '@sand/accounts/contract'
import type { Entry } from '@sand/chats/contract'
import { expect, test } from 'bun:test'
import type { UsageOrigin } from '../src/contract'
import { summaryHandler } from '../src/summary/serve'

const usage = (input: number) => ({ input, output: 1, cacheRead: 0, cacheWrite: 0 })

const tags = { source: 'claude', account: 'Claude Code', provider: 'anthropic', billing: 'plan' as const }

const sandRecord: UsageRecord = { id: 'u1', model: 'claude/opus', ...tags, usage: usage(100) }

const sandEntry: Entry = { id: 'e1', session: 'thread', parent: null, at: 2_000, type: 'usage', data: sandRecord, seq: 1 }

const past = (native: string, input: number, at = 2_000): PastTurn => ({ ...tags, model: 'claude/opus', native, at, usage: usage(input), cwd: '/work' })

const summary = summaryHandler({
  sessions: { list: () => [], entriesOfType: () => [sandEntry] },
  llm: () => ({ stream: async function* () {}, pastTurns: async since => [past('ran-in-sand', 100), past('ran-in-cli', 40), past('old', 7, 10)].filter(turn => turn.at >= since) }),
  native: () => ({ natives: () => new Set(['ran-in-sand']) }),
})

const inputFor = async (origin?: UsageOrigin) => (await summary({ since: 1_000, bucket: 'day', zone: 'UTC', ...(origin && { origin }) })).total.usage.input

test('usage from apps run outside sand adds to sand own, without counting the sessions sand ran twice', async () => {
  expect(await inputFor()).toBe(140)
  expect(await inputFor('sand')).toBe(100)
  expect(await inputFor('outside')).toBe(40)
})
