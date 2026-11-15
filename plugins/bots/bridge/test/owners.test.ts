import type { BotSummary } from '@sand/bots/contract'
import { expect, test } from 'bun:test'
import { threadOwnersOf } from '../src/web/owners'
import type { Roster } from '../src/web/roster'

const atlas = { id: 'b1', name: 'Atlas', initial: 'A', color: 'sky' } as BotSummary

const roster: Roster = {
  list: () => [atlas],
  find: id => (id === atlas.id ? atlas : undefined),
  starterOf: thread => ({ t1: 'b1', t2: 'gone' })[thread],
}

test('a bot owns the threads it started while it still exists', () => {
  const owners = threadOwnersOf(roster)

  expect(owners.owner('t1')).toEqual({ id: 'b1', label: 'Atlas', color: 'sky' })
  expect(owners.owner('t2')).toBeUndefined()
  expect(owners.owner('t3')).toBeUndefined()
})
