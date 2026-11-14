import { startSand, type Sand } from '@sand/harness'
import { historyRead, threadList, threadPending, threadSend, threadStart, threadUpdate, waitThread } from '@sand/orchestrator/contract'
import type { Source } from '@sand/replay/contract'
import { afterEach, expect, test } from 'bun:test'

let sand: Sand

afterEach(() => sand.stop())

const said = (text: string) => ({ type: 'text', text }) as const

const start = async (replies: Source['replies']) => {
  sand = await startSand([{ id: 'fake', models: ['m'], replies }])
  return { cwd: sand.home, model: 'fake/m', origin: 'cli', clientRequestId: 'first' } as const
}

test('a started thread runs to its reply, reads back in order, and a retried start returns the same thread and turn', async () => {
  const base = await start([[said('Hello back.')], [said('Second answer.')]])

  const [sent, retried] = await Promise.all([sand.ask(threadStart, { ...base, prompt: 'hi' }), sand.ask(threadStart, { ...base, prompt: 'hi' })])
  expect(retried).toEqual(sent)
  expect(sent).toEqual({ thread: expect.any(String), disposition: 'started', turn: expect.any(String) })
  expect(await waitThread(sand.ask, sent.thread, 'attention')).toEqual({ thread: sent.thread, turn: sent.turn, status: 'completed', reply: 'Hello back.' })
  expect(await sand.ask(threadStart, { ...base, prompt: 'hi' })).toEqual(sent)
  expect(sand.turns.get(sent.turn!)?.origin).toBe('cli')

  const next = await sand.ask(threadSend, { session: sent.thread, prompt: 'again', origin: 'mcp', clientRequestId: 'second' })
  expect(await waitThread(sand.ask, sent.thread, 'end')).toMatchObject({ turn: next.turn, status: 'completed', reply: 'Second answer.' })

  const page = await sand.ask(historyRead, { session: sent.thread, after: 0 })
  expect(page.items.map(({ role, text }) => [role, text])).toEqual([
    ['user', 'hi'],
    ['assistant', 'Hello back.'],
    ['user', 'again'],
    ['assistant', 'Second answer.'],
  ])
  expect(page.more).toBe(false)
  expect(await sand.ask(historyRead, { session: sent.thread, after: page.items[1]!.seq, limit: 1 })).toMatchObject({
    items: [{ role: 'user', text: 'again' }],
    more: true,
  })
  expect(await sand.ask(threadList, {})).toEqual([expect.objectContaining({ thread: sent.thread, status: 'completed', archived: false })])
})

test('archiving a running thread stops its turn first', async () => {
  const base = await start([[{ type: 'hold' }]])
  const sent = await sand.ask(threadStart, { ...base, prompt: 'go' })

  expect(await sand.ask(threadUpdate, { session: sent.thread, archived: true })).toMatchObject({ thread: sent.thread, archived: true })
  expect(sand.turns.get(sent.turn!)).toMatchObject({ status: 'interrupted' })
})

test('a message the page queues with a label waits as pending, and holding, releasing or withdrawing it is one call', async () => {
  const base = await start([[{ type: 'hold' }]])
  const { thread } = await sand.ask(threadStart, { ...base, prompt: 'go' })
  const chat = sand.sessions.require(thread)
  const prompt = [{ type: 'text', text: 'and then this' }] as const

  const queued = await sand.ask(threadSend, { session: thread, prompt: [...prompt], mode: 'queue', label: 'Next step', origin: 'user', clientRequestId: 'next' })
  if (queued.disposition === 'started') throw new Error('a busy thread started a second turn')
  const pending = queued.pending
  expect(sand.turns.pending(chat)).toEqual([expect.objectContaining({ id: pending, kind: 'queue', label: 'Next step', origin: 'user', held: false })])

  expect(await sand.ask(threadPending, { session: thread, pending, action: 'hold' })).toBe(true)
  expect(sand.turns.pending(chat)).toEqual([expect.objectContaining({ id: pending, held: true })])
  expect(await sand.ask(threadPending, { session: thread, pending, action: 'release' })).toBe(true)
  expect(sand.turns.pending(chat)).toEqual([expect.objectContaining({ id: pending, held: false })])
  expect(await sand.ask(threadPending, { session: thread, pending, action: 'withdraw' })).toBe(true)
  expect(sand.turns.pending(chat)).toEqual([])
})

test('a wait returns when the turn waits on the user, and waiting until the end goes on past it', async () => {
  const base = await start([[{ type: 'call', name: 'ask' }], [said('Thanks.')]])
  const answered = Promise.withResolvers<string>()
  sand.tool('ask', (_, context) => answered.promise.finally(context.wait({ kind: 'question', call: context.call.id, title: 'Which branch?' })))

  const sent = await sand.ask(threadStart, { ...base, prompt: 'go' })
  expect(await waitThread(sand.ask, sent.thread, 'attention')).toMatchObject({ status: 'waiting', waiting: { title: 'Which branch?' } })
  const ending = waitThread(sand.ask, sent.thread, 'end')
  answered.resolve('main')
  expect(await ending).toMatchObject({ status: 'completed', reply: 'Thanks.' })
})

test('a start refuses a folder that does not exist and a model nobody has, without making a thread', async () => {
  const base = await start([])

  await expect(sand.ask(threadStart, { ...base, cwd: `${sand.home}/missing`, prompt: 'go' })).rejects.toThrow(/^invalid_request: /)
  await expect(sand.ask(threadStart, { ...base, model: 'nobody', prompt: 'go' })).rejects.toThrow(/^invalid_request: No model matches/)
  expect(await sand.ask(threadList, {})).toEqual([])
})

test('a quick start from the page makes a scratch thread, and a quick start with a folder is refused', async () => {
  const { cwd, ...base } = await start([[said('Noted.')]])

  await expect(sand.ask(threadStart, { ...base, cwd, quick: true, prompt: 'go' })).rejects.toThrow(/^invalid_request: /)
  const sent = await sand.ask(threadStart, { ...base, quick: true, prompt: [{ type: 'text', text: 'jot this' }], label: 'Jot', origin: 'user' })
  const { kind, project } = sand.sessions.require(sent.thread)
  expect({ kind, project }).toEqual({ kind: 'quick', project: null })
  expect(await waitThread(sand.ask, sent.thread, 'end')).toMatchObject({ status: 'completed', reply: 'Noted.' })
  expect(sand.turns.get(sent.turn!)?.origin).toBe('user')
})
