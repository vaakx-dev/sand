import { describe, expect, test } from 'bun:test'
import type { Item } from '@sand/transcript/contract'
import { foldTurns, type FoldOptions } from '../src/turns/fold'

const options: FoldOptions = { older: false, running: false, waiting: false, streaming: false, started: undefined, open: () => false }

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
})
