import { describe, expect, test } from 'bun:test'
import type { Entry, Message } from '@sand/chats/contract'
import { itemSpot } from '../src/contract'
import { settledItems } from '../src/items/settled'

const message = (id: string, parent: string | null, data: Message, seq: number): Entry => ({ id, session: 's', parent, at: seq, type: 'message', data, seq })

const asked = message('u1', null, { role: 'user', content: [{ type: 'text', text: 'Find the bug' }] }, 1)
const worked = message(
  'a1',
  'u1',
  {
    role: 'assistant',
    content: [
      { type: 'thinking', thinking: 'Look at the parser' },
      { type: 'tool_call', id: 'c1', name: 'read', input: {} },
    ],
  },
  2,
)
const result = message('r1', 'a1', { role: 'user', content: [{ type: 'tool_result', callId: 'c1', content: [{ type: 'text', text: 'ok' }] }] }, 3)
const answered = message(
  'a2',
  'r1',
  {
    role: 'assistant',
    content: [
      { type: 'thinking', thinking: 'The parser drops the last line' },
      { type: 'text', text: 'Fixed the parser' },
    ],
  },
  4,
)

const { items } = settledItems({ id: 's' }, [asked, worked, result, answered], () => false, () => undefined)

describe('itemSpot', () => {
  test('finds a user message and the fold that hides a relayed one', () => {
    expect(itemSpot(items, asked)).toMatchObject({ key: 'u1', item: { kind: 'user' }, folds: ['user:u1'] })
  })

  test('finds thinking on its own or inside a tool group, with its fold to open', () => {
    expect(itemSpot(items, worked, 0)).toMatchObject({ key: 'u1:0', item: { kind: 'thinking' }, folds: ['u1:0'] })
    expect(itemSpot(items, answered, 0)).toMatchObject({ key: 'r1:0', item: { kind: 'tools' }, folds: ['r1:0'] })
  })

  test('finds a reply block, or the first shown block when none is named', () => {
    expect(itemSpot(items, answered, 1)).toMatchObject({ key: 'r1:1', item: { kind: 'text' }, folds: [] })
    expect(itemSpot(items, worked)?.key).toBe('u1:0')
  })

  test('finds nothing for a block that shows no item', () => {
    expect(itemSpot(items, worked, 1)).toBeUndefined()
  })
})
