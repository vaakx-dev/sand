import { startSand, type Sand } from '@sand/harness'
import { historyRead, threadList, threadSend, threadStart, threadUpdate, waitThread } from '@sand/orchestrator/contract'
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
  expect(await sand.ask(threadList, {})).toEqual([expect.objectContaining({ thread: sent.thread, status: 'completed', settled: false })])
})

test('settling a running thread stops its turn first', async () => {
  const base = await start([[{ type: 'hold' }]])
  const sent = await sand.ask(threadStart, { ...base, prompt: 'go' })

  expect(await sand.ask(threadUpdate, { session: sent.thread, settled: true })).toMatchObject({ thread: sent.thread, settled: true })
  expect(sand.turns.get(sent.turn!)).toMatchObject({ status: 'interrupted' })
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
