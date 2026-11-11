import type { BotSummary } from '@sand/bots/contract'
import type { Entry, UserContent } from '@sand/chats/contract'
import { expect, test } from 'bun:test'
import { threadOwnersOf } from '../src/web/owners'
import type { Roster } from '../src/web/roster'

const atlas = { id: 'b1', name: 'Atlas', initial: 'A', color: 'sky' } as BotSummary

const roster: Roster = {
  list: () => [atlas],
  find: id => (id === atlas.id ? atlas : undefined),
  starterOf: thread => ({ t1: 'b1', t2: 'gone' })[thread],
  startedBy: bot => (bot === 'b1' ? ['t1'] : []),
}

const prompt = (content: UserContent[]): Entry => ({ id: 'e1', session: 't1', parent: null, at: 1, seq: 1, type: 'message', data: { role: 'user', content } })

const botRecord = (data: Record<string, unknown>): UserContent => ({ type: 'context', records: [{ v: 1, id: 'r1', kind: 'bot', label: 'Atlas', data }] })

test("a bot owns the threads it started, opens them as its own thread screen when the shell is there, and signs only the prompts it sent", () => {
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

  const text: UserContent = { type: 'text', text: 'Fix the cache test' }
  expect(owners.sender('t1', prompt([text, botRecord({ id: 'b1', sent: true })]))?.label).toBe('Atlas')
  expect(owners.sender('t1', prompt([text, botRecord({ id: 'b1' })]))).toBeUndefined()
  expect(owners.sender('t1', prompt([text]))).toBeUndefined()
})
