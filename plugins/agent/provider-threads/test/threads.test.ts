import { type Session } from '@sand/chats/contract'
import { ledger } from '@sand/ledger/contract'
import { startSand, type Sand } from '@sand/harness'
import { modelSettings } from '@sand/model/contract'
import type { Source } from '@sand/replay/contract'
import { afterEach, expect, test } from 'bun:test'

let sand: Sand

afterEach(() => sand.stop())

const said = (text: string) => ({ type: 'text', text }) as const

type Block = Record<string, unknown> & { text?: string }

type Body = { system: { type: string; text: string }[]; tools?: { name: string }[]; messages: { role: string; content: Block[] }[] }

const uncached = (body: string): Body => JSON.parse(body, (key, value) => (key === 'cache_control' ? undefined : value))

const sent = (source: string) => sand.requests(source).map(uncached)

const api = (id: string, replies: Source['replies']): Source => ({ id, api: 'anthropic', models: ['m'], replies })

const use = (chat: Session, model: string) => sand.app.get(modelSettings)!.update(chat, { model })

const query = (sql: string) => sand.app.get(ledger)!.db.query(sql).all()

const expectPrefix = (before: Body, after: Body) => {
  expect(after.system).toEqual(before.system)
  expect(after.tools).toEqual(before.tools)
  expect(after.messages.slice(0, before.messages.length)).toEqual(before.messages)
}

const texts = (body: Body) => body.messages.map(message => message.content.map(block => block.text ?? block.type).join('|'))

const names = (body: Body) => (body.tools ?? []).map(tool => tool.name)

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

test('a chat from before threads keeps its stored system prompt and history on its first turn, without thinking another source wrote', async () => {
  sand = await startSand([api('a', [[said('again')]]), api('b', [])])
  const chat = sand.chat('a/m')
  const usage = { input: 10, output: 2, cacheRead: 0, cacheWrite: 0 }
  chat.append('system', 'The system prompt sand stored before threads.')
  chat.append('message', { role: 'user', content: [said('hello')] })
  chat.append('message', { role: 'assistant', content: [{ type: 'thinking', thinking: 'theirs', signature: 'sig' }, said('hi')] })
  chat.append('usage', { id: 'u1', model: 'b/m', usage })
  chat.append('message', { role: 'user', content: [said('and you?')] })
  chat.append('message', { role: 'assistant', content: [{ type: 'thinking', thinking: 'mine', signature: 'sig' }, said('yes')] })
  chat.append('usage', { id: 'u2', model: 'a/m', usage })

  await sand.turns.run(chat, 'next')

  const [body] = sent('a')
  expect(body!.system).toEqual([{ type: 'text', text: 'The system prompt sand stored before threads.' }])
  expect(body!.messages).toEqual([
    { role: 'user', content: [said('hello')] },
    { role: 'assistant', content: [said('hi')] },
    { role: 'user', content: [said('and you?')] },
    { role: 'assistant', content: [{ type: 'thinking', thinking: 'mine', signature: 'sig' }, said('yes')] },
    { role: 'user', content: [said('next')] },
  ])
})

test('a switch hands the new model its own system prompt and a budgeted handoff; coming back soon resends the warm prefix plus a delta, later a new thread', async () => {
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
  const [switched] = sent('b')
  expect(first!.system[0]!.text).toContain('- Model: a/m')
  expect(switched!.system[0]!.text).toContain('- Model: b/m')
  expect(switched!.messages).toHaveLength(1)
  const [handoff, prompt] = switched!.messages[0]!.content
  expect(handoff!.text).toMatch(/^Earlier messages of this chat, seq \d+–\d+, with replies from another model \(a\/m\):/)
  expect(handoff!.text).toContain(': 2 shown, 0 left out.')
  expect(handoff!.text).toMatch(/\[Historical user; prompt; item=[^;]+; seq=\d+; model=a\/m\]\none/)
  expect(handoff!.text).toMatch(/\[Historical assistant; reply; item=[^;]+; seq=\d+; model=a\/m\]\na1/)
  expect(prompt).toEqual(said('two'))
  expect(names(switched!)).toContain('thread_read')

  expectPrefix(first!, back!)
  expect(back!.messages).toHaveLength(3)
  const [delta, again] = back!.messages[2]!.content
  expect(delta!.text).toMatch(/^Earlier messages of this chat, seq \d+–\d+, with replies from another model \(b\/m\):/)
  expect(delta!.text).toContain('b1')
  expect(delta!.text).not.toContain(']\na1')
  expect(again).toEqual(said('three'))
  expect(names(back!)).not.toContain('thread_read')

  await turn('b/m', 'four')
  sand.app.get(ledger)!.db.run("update provider_threads set used = used - 3600000 where model = 'a/m'")
  await turn('a/m', 'five')
  const cold = sent('a').at(-1)!
  expect(cold.messages).toHaveLength(1)
  expect(texts(cold)[0]).toStartWith('Earlier messages of this chat')
  expect(query("select generation, status from provider_threads where model = 'a/m' order by generation")).toEqual([
    { generation: 1, status: 'retired' },
    { generation: 2, status: 'idle' },
  ])
  const strategies = chat.path().flatMap(entry => (entry.type === 'handoff' ? [(entry.data as { strategy: string }).strategy] : []))
  expect(strategies).toEqual(['full', 'delta', 'delta', 'full'])
  expect(query('select distinct delivery from handoffs')).toEqual([{ delivery: 'inline' }])
})

test('a model brought up to date can read the chat history itself', async () => {
  sand = await startSand([api('a', [[said('a1')]]), api('b', [[{ type: 'call', name: 'thread_read', input: { after: 0 } }], [said('b1')]])])
  const chat = sand.chat('a/m')
  await sand.turns.run(chat, 'one')
  use(chat, 'b/m')
  await sand.turns.run(chat, 'two')

  const [, answered] = sent('b')
  const [result] = answered!.messages.at(-1)!.content as { type: string; content: { text: string }[] }[]
  expect(result!.type).toBe('tool_result')
  expect(result!.content[0]!.text).toMatch(/\[Historical user; prompt; item=[^\]]+\]\none\n\n\[Historical assistant; reply; item=[^\]]+\]\na1/)
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

test('a model whose context overflowed is sent the summary and what compaction kept from then on, and a switch hands over the summary', async () => {
  sand = await startSand([
    api('a', [[said('a1')], [said('a2')], [{ type: 'error', message: 'prompt is too long' }], [said('the summary')], [said('a3')], [said('a4')]]),
    api('b', [[said('b1')]]),
  ])
  const chat = sand.chat('a/m')
  for (const prompt of ['one', 'two', 'three', 'four']) await sand.turns.run(chat, prompt)
  const thread = sand.turns.get(chat.path().at(-1)!.turn!)?.providerThread
  use(chat, 'b/m')
  await sand.turns.run(chat, 'five')

  const [, , , , retried, next] = sent('a')
  expect(chat.latest('compaction')?.data).toMatchObject({ reason: 'overflow', thread })
  expect(texts(retried!)[0]).toStartWith('Summary of the earlier conversation:\n\nthe summary')
  expectPrefix(retried!, next!)
  const [switched] = sent('b')
  expect(texts(switched!)[0]).toMatch(/\[Historical user; summary; item=[^\]]+\]\nSummary of the earlier conversation:\n\nthe summary/)
})

test('tool ids Anthropic would reject are made safe in what the model is sent back', async () => {
  sand = await startSand([api('a', [[{ type: 'call', id: 'functions.echo:0', name: 'echo', input: {} }], [said('a1')]])])
  sand.tool('echo', () => 'ok')
  const chat = sand.chat('a/m')
  await sand.turns.run(chat, 'one')

  const [, answered] = sent('a')
  expect(answered!.messages[1]!.content).toEqual([{ type: 'tool_use', id: 'functions_echo_0', name: 'echo', input: {} }])
  expect(answered!.messages[2]!.content[0]).toMatchObject({ type: 'tool_result', tool_use_id: 'functions_echo_0' })
})
