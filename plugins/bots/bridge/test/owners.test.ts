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

test("a bot owns the threads it started, opens them as its own thread screen when the shell is there", () => {
  const opened: [string, string | undefined][] = []
  const owners = threadOwnersOf(roster, { open: (bot, tab) => void opened.push([bot, tab]) }, {
    open: (route: { id?: string; tab?: string }) => void opened.push([route.id ?? '', route.tab]),
  } as never)

  const owner = owners.owner('t1')
  expect(owner).toMatchObject({ id: 'b1', label: 'Atlas', color: 'sky' })
  owner?.open('t1')
  expect(opened).toEqual([['t1', undefined]])
  expect(owners.owner('t2')).toBeUndefined()
  expect(owners.owner('t3')).toBeUndefined()
})
