import type { BotEntry, BotSummary } from '@sand/bots/contract'
import { expect, test } from 'bun:test'
import { linesOf } from '../src/chat/entry'
import { pageOf } from '../src/main'

const entry = (seq: number, type: string, data: unknown): BotEntry => ({ id: `e${seq}`, bot: 'b', seq, at: seq, type, data })

const bot = (id: string): BotSummary => ({
  id,
  name: id,
  initial: 'B',
  color: 'gold',
  job: '',
  models: { main: {}, quick: {} },
  computer: 'none',
  created: 0,
  updated: 0,
  status: 'idle',
})

test('the transcript shows what was said and failed turns, not tool traffic or usage', () => {
  const lines = linesOf([
    entry(1, 'message', { role: 'user', content: [{ type: 'text', text: 'Plan Thursday' }] }),
    entry(2, 'message', { role: 'assistant', content: [{ type: 'tool_call', id: 't', name: 'memory', input: {} }] }),
    entry(3, 'message', { role: 'user', content: [{ type: 'tool_result', id: 't', content: [{ type: 'text', text: 'ok' }] }] }),
    entry(4, 'message', { role: 'assistant', content: [{ type: 'text', text: 'Done' }, { type: 'tool_call', id: 'u', name: 'memory', input: {} }] }),
    entry(5, 'usage', { input: 10 }),
    entry(6, 'turn-ending', { stopReason: 'end_turn' }),
    entry(7, 'turn-ending', { stopReason: 'error', error: 'The model is offline' }),
  ])
  expect(lines).toEqual([
    { id: 'e1', kind: 'user', text: 'Plan Thursday' },
    { id: 'e4', kind: 'assistant', text: 'Done' },
    { id: 'e7', kind: 'error', text: 'The model is offline' },
  ])
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
