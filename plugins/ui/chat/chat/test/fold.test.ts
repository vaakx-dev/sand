import { describe, expect, test } from 'bun:test'
import type { ToolCallBlock } from '@sand/chats/contract'
import type { Item } from '@sand/transcript/contract'
import { foldTurns, type FoldOptions } from '../src/turns/fold'

const options: FoldOptions = { older: false, running: false, waiting: false, streaming: false, started: undefined, nested: [], open: () => false }

const user = (key: string, at: number): Item => ({ kind: 'user', key, parts: [{ kind: 'text', text: key }], steer: false, at, opens: key })
const thinking = (key: string, at: number): Item => ({ kind: 'thinking', key, text: key, streaming: false, at })
const text = (key: string, at: number): Item => ({ kind: 'text', key, text: key, streaming: false, at })
const custom = (key: string, at: number): Item => ({ kind: 'custom', key, entry: { id: key, session: 's', parent: null, at, type: 'bot-change', data: {}, seq: 1 } })

describe('foldTurns', () => {
  test('"Worked for" ends at the turn\'s reply, not at entries added after it', () => {
    const items = [user('u1', 1_000), thinking('u1:0', 2_000), text('u1:1', 7_000), custom('later', 90_000)]
    const head = foldTurns(items, options).find(shown => shown.kind === 'turn')
    expect(head).toMatchObject({ start: 1_000, end: 7_000 })
  })

  test('calls made inside a script count like top-level ones', () => {
    const nested = (id: string, name: string, path: string): ToolCallBlock => ({ type: 'tool_call', id, name, input: { path } })
    const script: ToolCallBlock = { type: 'tool_call', id: 's1', name: 'script', input: {} }
    const group: Item = { kind: 'tools', key: 'g', start: 2_000, end: 3_000, running: false, steps: [{ kind: 'tool', key: 's1', tool: { call: script, status: 'done', thread: 't' } }] }
    const calls = [nested('s1.0', 'edit', 'a.ts'), nested('s1.1', 'edit', 'b.ts'), nested('s2.0', 'edit', 'c.ts'), nested('s1.2', 'read', 'd.ts')]
    const head = foldTurns([user('u1', 1_000), group, text('u1:1', 7_000)], { ...options, nested: calls }).find(shown => shown.kind === 'turn')
    expect(head).toMatchObject({ summary: 'edited 2 files, read 1 file' })
  })
})
