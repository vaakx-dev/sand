import { notificationText } from '@sand/chats/contract'
import { expect, test } from 'bun:test'
import type { BotEntry } from '../src/contract'
import { lastLine } from '../src/last'

const entry = (seq: number, data: unknown): BotEntry => ({ id: `e${seq}`, bot: 'b1', seq, at: seq, type: 'message', data })

test('the preview skips notifications and relayed messages for the newest line a person or the bot said', () => {
  const notification = notificationText({ from: 'thread', id: 't1', kind: 'agent', label: 'Build', status: 'done', at: 0, result: 'ok' })
  const entries = [
    entry(4, { role: 'user', content: [{ type: 'text', text: notification }] }),
    entry(3, { role: 'user', content: [{ type: 'text', text: 'Status?' }, { type: 'context', records: [{ v: 1, id: 'r1', kind: 'thread', label: 'Build', data: { id: 't1', sent: true } }] }] }),
    entry(2, { role: 'assistant', content: [{ type: 'text', text: 'The **east bed** is dry.' }] }),
  ]
  expect(lastLine(entries, [])).toEqual({ entry: 'e2', role: 'assistant', text: 'The east bed is dry.', at: 2 })
})

test('the preview carries the gist kept for its own reply and ignores one kept for an older reply', () => {
  const reply = entry(2, { role: 'assistant', content: [{ type: 'text', text: 'Watered the east bed and logged it.' }] })
  const gist = (seq: number, of: string) => ({ ...entry(seq, { entry: of, text: 'Watered the east bed' }), type: 'bot-gist' })
  expect(lastLine([reply], [gist(3, 'e2')])?.gist).toBe('Watered the east bed')
  expect(lastLine([reply], [gist(3, 'e1')])?.gist).toBeUndefined()
})
