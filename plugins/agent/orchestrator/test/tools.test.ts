import { type Message, type Session, textOf } from '@sand/chats/contract'
import { startSand, type Sand } from '@sand/harness'
import { orchestrator } from '@sand/orchestrator/contract'
import type { Reply } from '@sand/replay/contract'
import { tools } from '@sand/tools/contract'
import { afterEach, expect, test } from 'bun:test'

let sand: Sand

afterEach(() => sand.stop())

const said = (text: string): Reply => [{ type: 'text', text }]

const start = async (replies = [said('child done'), said('Noted.'), said('Noted again.')]) => {
  sand = await startSand([{ id: 'fake', models: ['m'], replies }], {
    plugins: ['core/watch', 'agent/jobs', 'agent/subagents', 'agent/mcp-server', 'agent/threads-mcp'],
  })
}

const agent = (depth: number) => {
  const chat = sand.chat('fake/m')
  chat.append('agent', { depth, tools: ['alpha', 'beta'] })
  return chat
}

const use = async (session: Session, name: string, input: Record<string, unknown>) => {
  const registry = sand.app.get(tools)
  if (!registry) throw new Error('tools did not start')
  const call = { type: 'tool_call', id: `${name}-call`, name, input } as const
  const result = await registry.run(call, { cwd: session.cwd, signal: new AbortController().signal, conversation: session, turn: 'test', progress() {}, wait: () => () => {} })
  return { isError: Boolean(result.isError), text: textOf(result.content) }
}

test("a thread an agent starts runs with the agent's tool limits one level deeper, and the agent can wait for its reply", async () => {
  await start()
  const parent = agent(2)

  const started = await use(parent, 'thread_start', { prompt: 'child work', model: 'fake/m' })
  expect(started.isError).toBe(false)
  const sent = JSON.parse(started.text)
  expect(sand.sessions.require(sent.thread).latest('agent')?.data).toEqual({ name: 'thread', depth: 3, tools: ['alpha', 'beta'] })
  expect(sand.turns.get(sent.turn)?.origin).toBe('agent')

  const waited = await use(parent, 'thread_wait', { thread: sent.thread })
  expect(JSON.parse(waited.text)).toMatchObject({ thread: sent.thread, status: 'completed', reply: 'child done' })
})

test('an agent can neither start a thread past the deepest nesting nor message a thread with wider tools', async () => {
  await start()
  const wide = sand.chat('fake/m')

  expect(await use(agent(6), 'thread_start', { prompt: 'too deep' })).toEqual({ isError: true, text: expect.stringContaining('only nest 6 levels deep') })
  expect(await use(agent(1), 'thread_send', { thread: wide.id, prompt: 'do more' })).toEqual({
    isError: true,
    text: expect.stringContaining("you can't message it"),
  })
  expect(sand.sessions.list().filter(chat => chat.kind === 'thread')).toHaveLength(3)
})

test('a thread looks up its own past: what it did, and when', async () => {
  await start()
  const chat = sand.chat('fake/m')
  chat.append('message', { role: 'user', content: [{ type: 'text', text: 'Find otters' }] })
  chat.append('message', { role: 'assistant', content: [{ type: 'tool_call', id: 'search-1', name: 'web_search', input: { query: 'otters' } }] })
  chat.append('message', { role: 'user', content: [{ type: 'tool_result', callId: 'search-1', content: [{ type: 'text', text: 'Otters hold hands.' }] }] })
  chat.append('message', { role: 'assistant', content: [{ type: 'text', text: 'They hold hands.' }] })

  const found = JSON.parse((await use(chat, 'history_read', { view: 'activity', query: 'otters' })).text)
  expect(found).toMatchObject({ thread: chat.id, more: false })
  expect(found.items.map(({ text }: { text: string }) => text)).toEqual(['Find otters', '[web_search] {"query":"otters"}', '[web_search result] Otters hold hands.'])
  expect(found.items[0].at).toMatch(/^\w{3} \d{4}-\d\d-\d\d \d\d:\d\d [+-]\d\d:\d\d$/)
})

const heard = async (session: Session, count: number) => {
  for (let tries = 0; tries < 300; tries++) {
    const said = session.path().flatMap(entry => (entry.type === 'message' && (entry.data as Message).role === 'user' ? [textOf((entry.data as Message).content)] : []))
    if (said.length > count) return said.slice(1)
    await Bun.sleep(10)
  }
  throw new Error(`The thread heard ${count} notices or fewer`)
}

const startSubagent = async (parent: Session) => {
  const { text } = await use(parent, 'agent', { label: 'Child work', task: 'child work' })
  const subagent = /Started subagent (\S+?)\./.exec(text)?.[1]
  if (!subagent) throw new Error(`No subagent started: ${text}`)
  return subagent
}

test('a subagent tells the thread that started it its final reply when it finishes; a thread it starts stands on its own but remembers who started it', async () => {
  await start()
  const parent = agent(2)
  parent.append('message', { role: 'user', content: [{ type: 'text', text: 'Start a child' }] })

  const subagent = await startSubagent(parent)
  const notices = await heard(parent, 1)
  const [notice] = notices
  expect(notice).toContain(`<thread>${subagent}</thread>`)
  expect(notice).toContain('<status>done</status>')
  expect(notice).toContain('child done')
  const [first] = sand.sessions.require(subagent).path().filter(entry => entry.type === 'message')
  expect((first!.data as Message).content.at(-1)).toEqual({ type: 'context', records: [expect.objectContaining({ kind: 'thread', data: { id: parent.id, sent: true } })] })
  const threads = sand.app.get(orchestrator)!
  expect(threads.starterOf(subagent)).toEqual({ owner: 'thread', id: parent.id })

  const started = JSON.parse((await use(parent, 'thread_start', { prompt: 'own work', model: 'fake/m' })).text)
  expect(await sand.turns.wait(started.turn, 'end')).toMatchObject({ status: 'completed' })
  expect(threads.starterOf(started.thread)).toEqual({ owner: 'thread', id: parent.id })
  await Bun.sleep(100)
  expect(await heard(parent, 0)).toEqual(notices)
})

test('a thread waiting on its subagent gets the reply from the wait, not as a notice too', async () => {
  await start([[{ type: 'hold' }]])
  const parent = agent(2)
  parent.append('message', { role: 'user', content: [{ type: 'text', text: 'Start a child' }] })

  const thread = await startSubagent(parent)
  const waited = use(parent, 'thread_wait', { thread })
  await Bun.sleep(50)
  sand.turns.interrupt(sand.sessions.require(thread))
  expect(JSON.parse((await waited).text)).toMatchObject({ thread, status: 'interrupted' })
  await Bun.sleep(100)
  expect(await heard(parent, 0)).toEqual([])
})

test('a thread reads one item of its history in full, a long one in parts', async () => {
  await start()
  const chat = sand.chat('fake/m')
  const long = 'x'.repeat(9_000)
  const call = chat.append('message', { role: 'assistant', content: [{ type: 'tool_call', id: 'read-1', name: 'read', input: { path: 'a.txt' } }] })
  const result = chat.append('message', { role: 'user', content: [{ type: 'tool_result', callId: 'read-1', content: [{ type: 'text', text: long }] }] })
  const read = async (input: Record<string, unknown>) => JSON.parse((await use(chat, 'history_read', input)).text)

  const first = await read({ item: `${call.id}#read-1` })
  expect(first).toMatchObject({ thread: chat.id, seq: call.seq, role: 'assistant', nextOffset: 8_000 })
  expect(first.text).toStartWith('[read] {"path":"a.txt"}\n[read result] xxx')
  const rest = await read({ item: `${call.id}#read-1`, offset: first.nextOffset })
  expect(rest.nextOffset).toBeUndefined()
  expect(first.text + rest.text).toBe(`[read] {"path":"a.txt"}\n[read result] ${long}`)
  expect(await read({ item: String(result.seq) })).toMatchObject({ seq: result.seq, role: 'user', text: expect.stringMatching(/^\[read result\] x+$/), nextOffset: 8_000 })
  expect(await use(chat, 'history_read', { item: 'missing' })).toEqual({ isError: true, text: expect.stringContaining('No item missing') })
})
