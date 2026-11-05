import { type Peers, type PeerView, peers } from '@sand/devices-contract'
import { startSand, type Sand } from '@sand/harness'
import { threadList, threadRead, threadSend, threadStart, waitThread } from '@sand/orchestrator/contract'
import { afterEach, expect, test } from 'bun:test'

let sands: Sand[] = []

afterEach(async () => {
  await Promise.all(sands.map(sand => sand.stop()))
  sands = []
})

const said = (text: string) => ({ type: 'text', text }) as const

const boot = async (...replies: string[]) => {
  const sand = await startSand([{ id: 'fake', models: ['m'], replies: replies.map(reply => [said(reply)]) }])
  sands.push(sand)
  return sand
}

const box: PeerView = {
  id: 'box-id',
  name: 'Box',
  status: { phase: 'connected', route: { key: 'lan', kind: 'lan', source: 'seed', url: 'http://box' }, since: 0 },
  routes: [],
  attempts: [],
}

const linkedTo = (far: Sand): Peers => {
  const asNear = far.askAs({ device: 'near-id', kind: 'pc' })
  const call: Peers['call'] = (_, request, input) => asNear(request, input)
  return {
    list: () => [box],
    get: pc => (pc === box.id ? box : undefined),
    connected: () => [box.id],
    call,
    callEach: (request, input) =>
      call(box.id, request, input).then(
        value => [{ pc: box.id, ok: true, value }],
        (error: unknown) => [{ pc: box.id, ok: false, error }],
      ),
    fetch: () => Promise.reject(new Error('no fetch')),
    on: () => () => {},
    hello: () => undefined,
    directUrl: () => undefined,
    retry() {},
    onOpen: () => () => {},
    onChange: () => () => {},
  }
}

test('a PC starts, finds, waits for, reads and lists threads on another PC over its link, and lists its own beside them', async () => {
  const far = await boot('From the box.', 'Started on the box.')
  const near = await boot('From here.')
  near.app.provide(peers, linkedTo(far))
  const base = { model: 'fake/m', origin: 'cli', prompt: 'hi' } as const

  const there = await near.ask(threadStart, { ...base, pc: 'box', cwd: far.home, clientRequestId: 'there' })
  const here = await near.ask(threadStart, { ...base, cwd: near.home, clientRequestId: 'here' })
  expect(far.sessions.open(there.thread)).toBeDefined()
  expect(near.sessions.open(there.thread)).toBeUndefined()

  expect(await waitThread(near.ask, there.thread, 'attention')).toMatchObject({ status: 'completed', reply: 'From the box.' })
  expect(await waitThread(near.ask, here.thread, 'attention')).toMatchObject({ status: 'completed', reply: 'From here.' })
  expect((await near.ask(threadRead, { session: there.thread })).items.map(item => item.text)).toEqual(['hi', 'From the box.'])

  const unseen = await far.ask(threadStart, { ...base, cwd: far.home, clientRequestId: 'unseen' })
  expect(await waitThread(near.ask, unseen.thread, 'attention')).toMatchObject({ status: 'completed', reply: 'Started on the box.' })

  const rows = await near.ask(threadList, {})
  expect(new Map(rows.map(row => [row.thread, row.pc]))).toEqual(
    new Map([
      [there.thread, 'Box'],
      [unseen.thread, 'Box'],
      [here.thread, undefined],
    ]),
  )
  expect((await far.askAs({ device: 'near-id', kind: 'pc' })(threadList, {})).map(row => row.pc)).toEqual([undefined, undefined])

  await expect(near.ask(threadSend, { session: 'missing', prompt: 'hello', origin: 'cli', clientRequestId: 'gone' })).rejects.toThrow(
    /^not_found: No thread missing$/,
  )
  await expect(near.ask(threadStart, { ...base, pc: 'nowhere', cwd: far.home, clientRequestId: 'lost' })).rejects.toThrow(
    /^not_found: No paired PC is called nowhere/,
  )
})
