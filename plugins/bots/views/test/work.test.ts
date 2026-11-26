import type { BotSummary } from '@sand/bots/contract'
import { expect, test } from 'bun:test'
import { botStatus, statusLine, workingSince } from '../src/web/work'

const bot = (extra: Partial<BotSummary> = {}): BotSummary => ({
  id: 'harbor',
  name: 'Harbor',
  initial: 'H',
  color: 'sky',
  computer: 'this-pc',
  projects: [],
  paused: false,
  budget: null,
  folderId: null,
  created: 1,
  updated: 1,
  folder: '/bots/harbor',
  subagents: [],
  background: [],
  talked: 1,
  status: 'idle',
  spent: 0,
  jobs: [],
  last: { entry: 'ask', role: 'user', text: 'Check the harbour schedule', at: 500 },
  ...extra,
})

test("a bot's line counts the subagents and jobs it runs itself, even while it replies, and times its work from the first to start", () => {
  const replying = bot({ status: 'working', subagents: [300], background: [400] })
  expect(statusLine(replying)).toBe('1 subagent · 1 job')
  expect(workingSince(replying)).toBe(300)
  expect(botStatus(replying)).toBe('running')

  expect(statusLine(bot({ subagents: [100, 200] }))).toBe('2 subagents working')
  expect(statusLine(bot({ background: [100] }))).toBe('1 job working')
  expect(botStatus(bot({ background: [100] }))).toBe('running')
  expect(statusLine(bot({ status: 'working' }))).toBe('Working')
  expect(workingSince(bot({ status: 'working' }))).toBe(500)
  expect(statusLine(bot())).toBe('Check the harbour schedule')
  expect(workingSince(bot())).toBeUndefined()
})
