import type { Session } from '@sand/chats/contract'
import { startSand, type Sand } from '@sand/harness'
import type { Source } from '@sand/replay/contract'
import type { SendResult } from '@sand/turns-contract/contract'
import { afterEach, expect, test } from 'bun:test'

let sand: Sand

afterEach(() => sand.stop())

const said = (text: string) => ({ type: 'text', text }) as const

const start = async (replies: Source['replies'], queue = false) => {
  sand = await startSand([{ id: 'fake', models: ['m'], replies }], { options: { turns: { queue } } })
  const opened = Promise.withResolvers<void>()
  const released = Promise.withResolvers<string>()
  sand.tool('gate', () => {
    opened.resolve()
    return released.promise
  })
  return { chat: sand.chat('fake/m'), opened: opened.promise, release: () => released.resolve('open') }
}

const turnOf = (result: SendResult) => {
  if (result.disposition !== 'started') throw new Error(`Expected a started turn, not ${result.disposition}`)
  return result.turn
}

const idle = async (chat: Session) => {
  while (sand.turns.current(chat) || sand.turns.pending(chat).some(item => !item.held)) await Bun.sleep(10)
}

const asked = (chat: Session) =>
  chat.path().flatMap(entry => {
    const message = entry.data as { role?: string; content?: { type: string; text?: string }[] }
    if (entry.type !== 'message' || message.role !== 'user') return []
    return message.content!.flatMap(block => (block.type === 'text' ? [{ text: block.text, turn: entry.turn }] : []))
  })

test('a send starts an idle chat, and whatever is sent while it runs reaches that turn at its next step, once', async () => {
  const { chat, opened, release } = await start([[{ type: 'call', name: 'gate' }], [said('Took both.')]])

  const started = await sand.turns.send(chat, { prompt: 'go', clientRequestId: 'go' })
  expect(started).toEqual({ disposition: 'started', turn: expect.any(String) })
  await opened

  const steered = await sand.turns.send(chat, { prompt: 'also this', clientRequestId: 'steer' })
  expect(steered).toEqual({ disposition: 'steered', pending: expect.any(String), turn: turnOf(started) })
  expect(await sand.turns.send(chat, { prompt: 'also this', clientRequestId: 'steer' })).toEqual(steered)
  expect(await sand.turns.send(chat, { prompt: 'job finished', origin: 'job', clientRequestId: 'job' })).toMatchObject({ disposition: 'steered' })

  release()
  await idle(chat)

  expect(asked(chat)).toEqual([
    { text: 'go', turn: turnOf(started) },
    { text: 'also this', turn: turnOf(started) },
    { text: 'job finished', turn: turnOf(started) },
  ])
  expect(chat.messages().at(-1)).toEqual({ role: 'assistant', content: [said('Took both.')] })
})

test('with queueing on, what is sent while a turn runs waits, one turn each in order', async () => {
  const { chat, opened, release } = await start([[{ type: 'call', name: 'gate' }], [said('Done.')], [said('First queued.')], [said('Second queued.')]], true)
  const started = await sand.turns.send(chat, { prompt: 'go', clientRequestId: 'go' })
  await opened

  expect(await sand.turns.send(chat, { prompt: 'one', clientRequestId: 'one' })).toMatchObject({ disposition: 'queued' })
  await sand.turns.send(chat, { prompt: 'two', clientRequestId: 'two' })
  expect(sand.turns.pending(chat).map(item => [item.kind, item.label])).toEqual([
    ['queue', 'one'],
    ['queue', 'two'],
  ])

  release()
  await idle(chat)

  const [go, one, two] = asked(chat)
  expect([go, one, two].map(message => message?.text)).toEqual(['go', 'one', 'two'])
  expect(new Set([turnOf(started), one!.turn, two!.turn]).size).toBe(3)
  expect(chat.messages().at(-1)).toEqual({ role: 'assistant', content: [said('Second queued.')] })
  expect(sand.turns.pending(chat)).toEqual([])
})

test('an interrupt holds the user steers the turn had not taken and runs the rest next, and resuming a held one starts it', async () => {
  const { chat, opened } = await start([[{ type: 'call', name: 'gate' }], [said('Noted the job.')], [said('Resumed.')]])
  const sent = await sand.turns.send(chat, { prompt: 'go', clientRequestId: 'go' })
  await opened
  await sand.turns.send(chat, { prompt: 'actually, this', clientRequestId: 'steer' })
  await sand.turns.send(chat, { prompt: 'job finished', origin: 'job', clientRequestId: 'job' })

  expect(sand.turns.interrupt(chat)).toBe(true)
  const ended = await sand.turns.wait(turnOf(sent), 'end')
  expect(ended).toMatchObject({ status: 'interrupted' })
  await idle(chat)
  const [held] = sand.turns.pending(chat)
  expect(sand.turns.pending(chat)).toEqual([expect.objectContaining({ kind: 'queue', held: true, label: 'actually, this' })])
  expect(asked(chat).map(message => message.text)).toEqual(['go', 'job finished'])

  expect(sand.turns.hold(chat, held!.id, false)).toBe(true)
  await idle(chat)
  expect(asked(chat).map(message => message.text)).toEqual(['go', 'job finished', 'actually, this'])
  expect(chat.messages().at(-1)).toEqual({ role: 'assistant', content: [said('Resumed.')] })
}, 10_000)

test('a first send picks the chat its model, and the same request id twice starts one turn', async () => {
  sand = await startSand([{ id: 'fake', models: ['m'], replies: [[said('Hi.')]] }])
  const chat = sand.sessions.thread(sand.home)
  const input = { prompt: 'hello', clientRequestId: 'once', settings: { model: 'fake/m' } }

  const [first, again] = await Promise.all([sand.turns.send(chat, input), sand.turns.send(chat, input)])

  expect(again).toEqual(first)
  expect(sand.turns.get(turnOf(first))).toMatchObject({ selection: { model: 'fake/m' } })
  await idle(chat)
  expect(chat.messages()).toEqual([
    { role: 'user', content: [said('hello')] },
    { role: 'assistant', content: [said('Hi.')] },
  ])
})

test('a send to an archived chat reopens it, whoever sends it', async () => {
  sand = await startSand([{ id: 'fake', models: ['m'], replies: [[said('Done.')], [said('Back on it.')]] }])
  const chat = sand.chat('fake/m')
  await sand.turns.send(chat, { prompt: 'go', clientRequestId: 'go' })
  await idle(chat)
  await sand.sessions.archive(chat.id, true)
  expect(chat.archived).not.toBeNull()

  await sand.turns.send(chat, { prompt: 'one more thing', origin: 'bot', clientRequestId: 'more' })

  expect(chat.archived).toBeNull()
  await idle(chat)
  expect(chat.messages().at(-1)).toEqual({ role: 'assistant', content: [said('Back on it.')] })
})

test('a tool waiting for the user puts its turn in the waiting state until it answers', async () => {
  sand = await startSand([{ id: 'fake', models: ['m'], replies: [[{ type: 'call', name: 'ask' }], [said('Thanks.')]] }])
  const answered = Promise.withResolvers<string>()
  sand.tool('ask', async (_, context) => {
    const done = context.wait({ kind: 'secret', call: context.call.id, title: 'Token' })
    return answered.promise.finally(done)
  })
  const chat = sand.chat('fake/m')
  const turn = turnOf(await sand.turns.send(chat, { prompt: 'go', clientRequestId: 'go' }))

  expect(await sand.turns.wait(turn, 'attention')).toMatchObject({ status: 'waiting', waiting: { kind: 'secret', title: 'Token' } })
  answered.resolve('secret saved')
  expect(await sand.turns.wait(turn, 'end')).toMatchObject({ status: 'completed' })
  expect(sand.turns.get(turn)?.waiting).toBeUndefined()
})
