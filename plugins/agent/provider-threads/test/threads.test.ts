import { ledger, type Session } from '@sand/chats/contract'
import { startSand, type Sand } from '@sand/harness'
import { modelSettings } from '@sand/model/contract'
import type { Source } from '@sand/replay/contract'
import { afterEach, expect, test } from 'bun:test'

let sand: Sand

afterEach(() => sand.stop())

const said = (text: string) => ({ type: 'text', text }) as const

type Body = { system: { type: string; text: string }[]; tools: unknown[]; messages: { role: string; content: Record<string, unknown>[] }[] }

const uncached = (body: string): Body => JSON.parse(body, (key, value) => (key === 'cache_control' ? undefined : value))

const sent = (source: string) => sand.requests(source).map(uncached)

const api = (id: string, replies: Source['replies']): Source => ({ id, api: 'anthropic', models: ['m'], replies })

const use = (chat: Session, model: string) => sand.app.get(modelSettings)!.update(chat, { model })

const expectPrefix = (before: Body, after: Body) => {
  expect(after.system).toEqual(before.system)
  expect(after.tools).toEqual(before.tools)
  expect(after.messages.slice(0, before.messages.length)).toEqual(before.messages)
}

const texts = (body: Body) => body.messages.map(message => message.content.map(block => block.text ?? block.type).join('|'))

test('a model gets the same growing prefix every step and turn, so its cache stays warm', async () => {
  sand = await startSand([api('a', [[said('one')], [{ type: 'call', name: 'echo', input: { word: 'x' } }], [said('two')], [said('three')]])])
  sand.tool('echo', ({ word }) => String(word))
  const chat = sand.chat('a/m')

  for (const prompt of ['first', 'second', 'third']) await sand.turns.run(chat, prompt)

  const bodies = sent('a')
  expect(bodies).toHaveLength(4)
  for (let at = 1; at < bodies.length; at++) expectPrefix(bodies[at - 1]!, bodies[at]!)
  expect(texts(bodies[3]!)).toEqual(['first', 'one', 'second', 'tool_use', 'tool_result', 'two', 'third'])
})

test('a chat from before threads keeps sending its stored system prompt and history on its first turn', async () => {
  sand = await startSand([api('a', [[said('again')]])])
  const chat = sand.chat('a/m')
  chat.append('system', 'The system prompt sand stored before threads.')
  chat.append('message', { role: 'user', content: [said('hello')] })
  chat.append('message', { role: 'assistant', content: [{ type: 'thinking', thinking: 'hm', signature: 'sig' }, said('hi')] })
  chat.append('usage', { id: 'u1', model: 'a/m', usage: { input: 10, output: 2, cacheRead: 0, cacheWrite: 0 } })

  await sand.turns.run(chat, 'next')

  const [body] = sent('a')
  expect(body!.system).toEqual([{ type: 'text', text: 'The system prompt sand stored before threads.' }])
  expect(body!.messages).toEqual([
    { role: 'user', content: [said('hello')] },
    { role: 'assistant', content: [{ type: 'thinking', thinking: 'hm', signature: 'sig' }, said('hi')] },
    { role: 'user', content: [said('next')] },
  ])
})

test('another model gets its own system prompt; coming back within the cache time resends the earlier prefix, later a new thread', async () => {
  sand = await startSand([api('a', [[said('a1')], [said('a2')], [said('a3')]]), api('b', [[said('b1')], [said('b2')]])])
  const chat = sand.chat('a/m')
  const turn = async (model: string, prompt: string) => {
    use(chat, model)
    await sand.turns.run(chat, prompt)
  }
  await turn('a/m', 'one')
  await turn('b/m', 'two')
  await turn('a/m', 'three')

  const [first, back] = sent('a')
  const [other] = sent('b')
  expect(other!.system[0]!.text).toContain('- Model: b/m')
  expect(first!.system[0]!.text).toContain('- Model: a/m')
  expectPrefix(first!, back!)
  expect(texts(back!)).toEqual(['one', 'a1', 'two', 'b1', 'three'])

  await turn('b/m', 'four')
  sand.app.get(ledger)!.db.run("update provider_threads set used = used - 3600000 where model = 'a/m'")
  await turn('a/m', 'five')
  const generations = sand.app.get(ledger)!.db.query("select generation, status from provider_threads where model = 'a/m' order by generation").all()
  expect(generations).toEqual([
    { generation: 1, status: 'retired' },
    { generation: 2, status: 'idle' },
  ])
})

test('after going back to an earlier message, the model is sent the shared start and the new branch only', async () => {
  sand = await startSand([api('a', [[said('a1')], [said('a2')], [said('a3')]])])
  const chat = sand.chat('a/m')
  await sand.turns.run(chat, 'one')
  const reply = chat.head
  await sand.turns.run(chat, 'two')
  chat.checkout(reply)
  await sand.turns.run(chat, 'again')

  const [first, , branch] = sent('a')
  expectPrefix(first!, branch!)
  expect(texts(branch!)).toEqual(['one', 'a1', 'again'])
})

test('a model whose context overflowed is sent the summary and what compaction kept, from then on', async () => {
  sand = await startSand([
    api('a', [[said('a1')], [said('a2')], [{ type: 'error', message: 'prompt is too long' }], [said('the summary')], [said('a3')], [said('a4')]]),
  ])
  const chat = sand.chat('a/m')
  for (const prompt of ['one', 'two', 'three', 'four']) await sand.turns.run(chat, prompt)

  const [, , , , retried, next] = sent('a')
  expect(chat.latest('compaction')?.data).toMatchObject({ reason: 'overflow', thread: sand.turns.get(chat.path().at(-1)!.turn!)?.providerThread })
  expect(texts(retried!)[0]).toStartWith('The earlier part of this conversation was compacted. Summary:\n\nthe summary')
  expectPrefix(retried!, next!)
})

test('tool ids another provider made are safe for Anthropic, and thinking is replayed only to the source that wrote it', async () => {
  sand = await startSand([
    api('a', [[{ type: 'thinking', text: 'mine' }, { type: 'call', id: 'functions.echo:0', name: 'echo', input: {} }], [said('a1')], [said('a2')]]),
    api('b', [[said('b1')]]),
  ])
  sand.tool('echo', () => 'ok')
  const chat = sand.chat('a/m')
  await sand.turns.run(chat, 'one')
  use(chat, 'b/m')
  await sand.turns.run(chat, 'two')

  const [, answered] = sent('a')
  const [other] = sent('b')
  expect(answered!.messages[1]!.content).toEqual([
    { type: 'thinking', thinking: 'mine', signature: 'replay' },
    { type: 'tool_use', id: 'functions_echo_0', name: 'echo', input: {} },
  ])
  expect(answered!.messages[2]!.content[0]).toMatchObject({ type: 'tool_result', tool_use_id: 'functions_echo_0' })
  expect(other!.messages[1]!.content).toEqual([{ type: 'tool_use', id: 'functions_echo_0', name: 'echo', input: {} }])
})
