import type { PastTurn, UsageRecord } from '@sand/accounts/contract'
import type { Entry } from '@sand/chats/contract'
import { expect, test } from 'bun:test'
import type { UsageOrigin } from '../src/contract'
import { OutsideTurns } from '../src/summary/outside'
import { summaryHandler } from '../src/summary/serve'

const usage = (input: number) => ({ input, output: 1, cacheRead: 0, cacheWrite: 0 })

const tags = { source: 'claude', account: 'Claude Code', provider: 'anthropic', billing: 'plan' as const }

const sandRecord: UsageRecord = { id: 'u1', model: 'claude/opus', ...tags, usage: usage(100) }

const sandEntry: Entry = { id: 'e1', session: 'thread', parent: null, at: 2_000, type: 'usage', data: sandRecord, seq: 1 }

const past = (native: string, input: number, at = 2_000): PastTurn => ({ ...tags, model: 'claude/opus', native, at, usage: usage(input), cwd: '/work' })

const llm = () => ({ stream: async function* () {}, pastTurns: async (since: number) => [past('ran-in-sand', 100), past('ran-in-cli', 40), past('old', 7, 10)].filter(turn => turn.at >= since) })

const changed = Promise.withResolvers<void>()

const outside = new OutsideTurns({ llm, native: () => ({ natives: () => new Set(['ran-in-sand']) }), changed: changed.resolve })

const summary = summaryHandler({ sessions: { list: () => [], entriesOfType: () => [sandEntry] }, llm, outside })

const inputFor = (origin?: UsageOrigin) => summary({ since: 1_000, bucket: 'day', zone: 'UTC', ...(origin && { origin }) }).total.usage.input

test('usage from apps run outside sand arrives after sand own, without counting the sessions sand ran twice', async () => {
  expect(inputFor()).toBe(100)
  await changed.promise
  expect(inputFor()).toBe(140)
  expect(inputFor('sand')).toBe(100)
  expect(inputFor('outside')).toBe(40)
})

test('reading outside history that holds nothing new tells no one, so pages do not load twice', async () => {
  let announced = 0
  const quiet = new OutsideTurns({ llm: () => ({ stream: async function* () {}, pastTurns: async () => [] }), native: () => undefined, changed: () => announced++ })
  quiet.turns(1_000)
  await Bun.sleep(0)
  expect(quiet.turns(1_000)).toEqual([])
  expect(announced).toBe(0)
})
