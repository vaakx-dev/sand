import type { SessionInfo } from '@sand/chats/contract'
import type { Wire, WireListener } from '@sand/devices-contract'
import type { Request, WireEvent } from '@sand/host-hub/contract'
import { type LiveSnapshot, liveSnapshot, llmEventWire, type Mark } from '@sand/server/contract'
import { type TurnInfo, turnChangeWire } from '@sand/turns-contract/contract'
import { jobEndWire, jobStartWire, type WireJob } from '@sand/jobs/contract'
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

test('a thread knows what its turn waits on until the turn moves on or ends', () => {
  const { wire, emit } = fakeWire()
  const store = new Store(createApp(), 'home')
  store.upsert(info('chat'), pc)
  listenThreads(wire, store, () => {})
  const turn: TurnInfo = {
    id: 't1',
    session: 'chat',
    ordinal: 1,
    status: 'running',
    origin: 'user',
    selection: { source: 'a', model: 'a/m', speed: 'normal' },
    prompt: 'go',
    step: 1,
    usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    started: 1,
  }
  const change = (info: TurnInfo) => emit(turnChangeWire, [{ $session: { id: 'chat' } }, info])
  const waiting = { kind: 'question', call: 'c1', title: 'Which day?' } as const

  change({ ...turn, status: 'waiting', waiting })
  expect(store.threads.get('chat')).toMatchObject({ running: true, waiting })
  change(turn)
  expect(store.threads.get('chat')?.waiting).toBeUndefined()
  change({ ...turn, status: 'waiting', waiting })
  change({ ...turn, status: 'completed', ended: 2 })
  expect(store.threads.get('chat')).toMatchObject({ running: false, waiting: undefined })
})

test('a thread between turns counts as running while a background job it launched is still going', () => {
  const { wire, emit } = fakeWire()
  const store = new Store(createApp(), 'home')
  store.upsert(info('chat'), pc)
  listenThreads(wire, store, () => {})
  const job: WireJob = { id: 'job-1', label: 'bun test', parent: 'chat', status: 'running', started: 1 }

  emit(jobStartWire, job)
  expect(store.threads.get('chat')?.running).toBe(true)

  emit(jobEndWire, [{ ...job, status: 'done', ended: 2 }, 'ok'])
  expect(store.threads.get('chat')?.running).toBe(false)
})

test('a thread counts as running while a subagent it started is in a turn', () => {
  const { wire, emit } = fakeWire()
  const store = new Store(createApp(), 'home')
  store.upsert(info('chat'), pc)
  store.upsert({ ...info('helper'), kind: 'agent', parent: 'chat' }, pc)
  listenThreads(wire, store, () => {})
  const turn: TurnInfo = {
    id: 't1',
    session: 'helper',
    ordinal: 1,
    status: 'running',
    origin: 'agent',
    selection: { source: 'a', model: 'a/m', speed: 'normal' },
    prompt: 'dig',
    step: 1,
    usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    started: 1,
  }
  const change = (info: TurnInfo) => emit(turnChangeWire, [{ $session: { id: 'helper' } }, info])

  change(turn)
  expect(store.threads.get('chat')?.running).toBe(true)

  change({ ...turn, status: 'completed', ended: 2 })
  expect(store.threads.get('chat')?.running).toBe(false)
})
