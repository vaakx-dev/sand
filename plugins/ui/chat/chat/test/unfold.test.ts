import { describe, expect, test } from 'bun:test'
import type { Item } from '@sand/transcript/contract'
import { unfolding, type FoldOptions } from '../src/turns/fold'

const options: FoldOptions = { older: false, running: false, waiting: false, streaming: false, started: undefined, open: () => false }

const user = (key: string): Item => ({ kind: 'user', key, parts: [{ kind: 'text', text: key }], steer: false, at: 1, opens: key })
const text = (key: string): Item => ({ kind: 'text', key, text: key, streaming: false, at: 2 })
const thinking = (key: string): Item => ({ kind: 'thinking', key, text: key, streaming: false, at: 2 })

const turns = [user('u1'), thinking('u1:0'), text('u1:1'), text('u1:2'), user('u2'), text('u2:0')]

describe('unfolding', () => {
  test('names the turn whose "Worked for" fold hides the item', () => {
    expect(unfolding(turns, 'u1:0', options)).toEqual({ kind: 'turn', key: 'turn:u1' })
    expect(unfolding(turns, 'u1:1', options)).toEqual({ kind: 'turn', key: 'turn:u1' })
  })

  test('leaves shown items and open turns alone', () => {
    expect(unfolding(turns, 'u1:2', options)).toEqual({ kind: 'shown' })
    expect(unfolding(turns, 'u2', options)).toEqual({ kind: 'shown' })
    expect(unfolding(turns, 'u1:0', { ...options, open: key => key === 'turn:u1' })).toEqual({ kind: 'shown' })
  })

  test('reports work cut off from its turn by unloaded history as hidden', () => {
    expect(unfolding(turns.slice(1), 'u1:0', { ...options, older: true })).toEqual({ kind: 'hidden' })
  })
})
