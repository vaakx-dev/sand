import type { UsageRecord } from '@sand/accounts/contract'
import type { Entry } from '@sand/chats/contract'
import { expect, test } from 'bun:test'
import { turnsOf } from '../src/summary/turns'

let seq = 0

const usage = (session: string, model: string, input: number, turn?: string): Entry => {
  const record: UsageRecord = { id: `u${++seq}`, model, source: model.split('/')[0], usage: { input, output: 1, cacheRead: 0, cacheWrite: 0 } }
  return { id: `e${seq}`, session, parent: null, at: seq, type: 'usage', data: record, seq, ...(turn && { turn }) }
}

test('the steps of a turn add up to one turn per model, and records without a turn count on their own', () => {
  const entries = [
    usage('a', 'x/opus', 10, 't1'),
    usage('a', 'x/opus', 20, 't1'),
    usage('a', 'y/mini', 5, 't1'),
    usage('a', 'x/opus', 7, 't2'),
    usage('b', 'x/opus', 3),
    usage('b', 'x/opus', 4),
  ]

  expect(turnsOf(entries).map(turn => [turn.session, turn.model, turn.usage.input, turn.usage.output])).toEqual([
    ['a', 'x/opus', 30, 2],
    ['a', 'y/mini', 5, 1],
    ['a', 'x/opus', 7, 1],
    ['b', 'x/opus', 3, 1],
    ['b', 'x/opus', 4, 1],
  ])
})
