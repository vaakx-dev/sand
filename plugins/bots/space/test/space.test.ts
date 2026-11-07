import type { BotSummary } from '@sand/bots/contract'
import { expect, test } from 'bun:test'
import { pageOf } from '../src/main'

const bot = (id: string): BotSummary => ({
  id,
  name: id,
  initial: 'B',
  color: 'gold',
  job: '',
  models: { main: {}, quick: {} },
  computer: 'none',
  project: null,
  paused: false,
  budget: null,
  created: 0,
  updated: 0,
  status: 'idle',
  spent: 0,
})

test('the address picks the page, falling back to the newest bot or the new-bot flow', () => {
  const newest = bot('a')
  const older = bot('b')
  const bots = [newest, older]
  expect(pageOf({ profile: false }, undefined)).toEqual({ kind: 'loading' })
  expect(pageOf({ bot: 'b', profile: true }, bots)).toEqual({ kind: 'profile', bot: older })
  expect(pageOf({ bot: 'gone', profile: true }, bots)).toEqual({ kind: 'chat', bot: newest })
  expect(pageOf({ profile: false }, [])).toEqual({ kind: 'new' })
  expect(pageOf({ bot: 'new', profile: false }, bots)).toEqual({ kind: 'new' })
})
