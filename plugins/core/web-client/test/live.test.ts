import type { SessionInfo } from '@sand/chats/contract'
import type { Wire, WireListener } from '@sand/devices-contract'
import type { Request, WireEvent } from '@sand/host-hub/contract'
import { type LiveSnapshot, liveSnapshot, llmEventWire, type Mark } from '@sand/server/contract'
import { afterAll, beforeAll, expect, test } from 'bun:test'
import { createApp } from 'drydock'
import { listenThreads } from '../src/threads/events'
import { Store } from '../src/threads/store'

beforeAll(() => Object.assign(globalThis, { window: { requestAnimationFrame: () => 0, cancelAnimationFrame: () => {} } }))
afterAll(() => Reflect.deleteProperty(globalThis, 'window'))

const pc = 'pc-b'

const fakeWire = () => {
  const listeners = new Map<string, WireListener<unknown>[]>()
  const calls: { type: string; input: unknown; pc?: string }[] = []
  const wire: Wire = {
    ready: () => true,
    call: <I, O>(request: Request<I, O>, input: I, to?: string) => {
      calls.push({ type: request.id, input, pc: to })
      return new Promise<O>(() => {})
    },
    on: <P>(event: WireEvent<P>, listener: WireListener<P>) => {
      listeners.set(event.id, [...(listeners.get(event.id) ?? []), listener as WireListener<unknown>])
      return () => {}
    },
    hello: () => undefined,
    fetch: () => Promise.reject(new Error('no fetch')),
    url: path => path,
  }
  const emit = <P>(event: WireEvent<P>, payload: P) => {
    for (const listener of listeners.get(event.id) ?? []) listener(payload, pc)
  }
  return { wire, calls, emit }
}

const info = (id: string): SessionInfo => ({
  id,
  created: 0,
  cwd: '/',
  project: null,
  head: null,
  kind: 'thread',
  parent: null,
  origin: null,
  title: '',
  seen: true,
  pinned: false,
  settled: null,
  snoozed: null,
  position: null,
})

const shown = (store: Store) => store.threads.get('chat')?.live.map(block => (block.type === 'tool' ? '' : block.text)).join('')

test('a gap in the live stream is not applied; the page asks for a fresh snapshot once and follows on from it', () => {
  const { wire, calls, emit } = fakeWire()
  const store = new Store(createApp(), 'home')
  store.upsert(info('chat'), pc)
  store.current = 'chat'
  listenThreads(wire, store, () => {})
  const text = (text: string, mark: Mark) => emit(llmEventWire, [{ type: 'text', index: 0, text }, { $session: { id: 'chat' } }, mark])
  const snapshot = (live: string, mark: Mark): LiveSnapshot => ({ live: [{ type: 'text', index: 0, text: live }], tools: [], mark })

  text('a', { turn: 't1', n: 1 })
  text('b', { turn: 't1', n: 2 })
  text('d', { turn: 't1', n: 4 })
  text('e', { turn: 't1', n: 5 })

  expect(shown(store)).toBe('ab')
  expect(calls).toEqual([{ type: 'ui.focus', input: { session: 'chat' }, pc }])

  emit(liveSnapshot, ['chat', snapshot('abcde', { turn: 't1', n: 5 })])
  text('f', { turn: 't1', n: 6 })
  expect(shown(store)).toBe('abcdef')

  text('x', { turn: 't2', n: 3 })
  expect(shown(store)).toBe('abcdef')
})
