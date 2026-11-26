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

  test('a running turn shows its newest thought that has a body, and a finished one shows none', () => {
    const titled = (key: string, text: string): Item => ({ kind: 'thinking', key, text, streaming: false, at: 2_000 })
    const group: Item = { kind: 'tools', key: 'g', start: 2_000, end: 3_000, running: false, steps: [{ kind: 'thinking', key: 'g:0', text: '**Reading the parser**\nThe last line has no newline.', streaming: false }] }
    const items = [user('u1', 1_000), titled('u1:0', 'Check the parser first.'), group, titled('u1:2', '**Fixing it**')]
    const headOf = (running: boolean) => foldTurns(items, { ...options, running }).find(shown => shown.kind === 'turn')
    expect(headOf(true)).toMatchObject({ thought: { key: 'g:0', body: 'The last line has no newline.' } })
    expect(headOf(false)).toMatchObject({ thought: undefined })
  })

  describe('a reply followed by something that arrived mid-turn stays out of the fold', () => {
    const steer: Item = { kind: 'user', key: 'steer', parts: [{ kind: 'text', text: 'steer' }], steer: true, at: 5_000 }
    const ending: Item = { kind: 'notice', key: 'ending', text: 'Interrupted', tone: 'dim' }
    const shownKeys = (items: Item[]) => foldTurns([{ ...custom('notified', 1_000), opens: 'notified' }, ...items], options).flatMap(shown => (shown.kind === 'item' ? [shown.key] : []))

    test('a notification', () => {
      const items = [thinking('t1', 2_000), text('first reply', 3_000), custom('notified again', 4_000), thinking('t2', 5_000), text('second reply', 6_000)]
      expect(shownKeys(items)).toEqual(['notified', 'first reply', 'notified again', 'second reply'])
    })

    test('a steer, with a notice between them', () => {
      const items = [thinking('t1', 2_000), text('first reply', 3_000), ending, steer, thinking('t2', 6_000), text('second reply', 7_000)]
      expect(shownKeys(items)).toEqual(['notified', 'first reply', 'steer', 'second reply'])
    })

    test('while text followed by more work stays folded', () => {
      const items = [text('narration', 2_000), thinking('t1', 3_000), steer, text('reply', 6_000)]
      expect(shownKeys(items)).toEqual(['notified', 'steer', 'reply'])
    })

    test('a formatted reply sent with a tool call, but not a short narration', () => {
      const said = (key: string, body: string, at: number): Item => ({ kind: 'text', key, text: body, streaming: false, at })
      const call = (key: string, at: number): Item => ({ kind: 'tools', key, start: at, end: at, running: false, steps: [{ kind: 'tool', key: `${key}:0`, tool: { call: { type: 'tool_call', id: key, name: 'sleep', input: {} }, status: 'done', thread: 't' } }] })
      const items = [
        said('narration', 'Let me check that.', 2_000),
        call('read', 2_500),
        said('formatted reply', '## Fixed\n- The parser keeps the last line.', 3_000),
        call('sleep', 3_500),
        custom('notified again', 4_000),
        text('second reply', 5_000),
      ]
      expect(shownKeys(items)).toEqual(['notified', 'formatted reply', 'notified again', 'second reply'])
    })
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
