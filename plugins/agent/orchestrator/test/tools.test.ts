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
  chat.append('agent', { name: 'general', depth, tools: ['thread_start', 'thread_send', 'thread_wait'] })
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
  expect(sand.sessions.require(sent.thread).latest('agent')?.data).toEqual({ name: 'thread', depth: 3, tools: ['thread_start', 'thread_send', 'thread_wait'] })
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

const heard = async (session: Session, count: number) => {
  for (let tries = 0; tries < 300; tries++) {
    const said = session.path().flatMap(entry => (entry.type === 'message' && (entry.data as Message).role === 'user' ? [textOf((entry.data as Message).content)] : []))
    if (said.length > count) return said.slice(1)
    await Bun.sleep(10)
  }
  throw new Error(`The thread heard ${count} notices or fewer`)
}

test('a thread tells the thread that started it its final reply when it finishes, and other features can notify the starter too', async () => {
  await start()
  const parent = agent(2)
  parent.append('message', { role: 'user', content: [{ type: 'text', text: 'Start a child' }] })

  const { thread } = JSON.parse((await use(parent, 'thread_start', { prompt: 'child work', model: 'fake/m' })).text)
  const [notice] = await heard(parent, 1)
  expect(notice).toContain(`<thread>${thread}</thread>`)
  expect(notice).toContain('<status>done</status>')
  expect(notice).toContain('child done')
  const [first] = sand.sessions.require(thread).path().filter(entry => entry.type === 'message')
  expect((first!.data as Message).content.at(-1)).toEqual({ type: 'context', records: [expect.objectContaining({ kind: 'thread', data: { id: parent.id, sent: true } })] })

  const threads = sand.app.get(orchestrator)!
  expect(threads.starterOf(thread)).toEqual({ owner: 'thread', id: parent.id })
  expect(await threads.notify(thread, { text: '<pr>merged</pr>', clientRequestId: 'pr-1' })).toBe(true)
  expect((await heard(parent, 2))[1]).toBe('<pr>merged</pr>')
  expect(await threads.notify(parent.id, { text: 'nobody', clientRequestId: 'pr-2' })).toBe(false)
})

test('a thread waiting on a thread it started gets the reply from the wait, not as a notice too', async () => {
  await start([[{ type: 'hold' }]])
  const parent = agent(2)
  parent.append('message', { role: 'user', content: [{ type: 'text', text: 'Start a child' }] })

  const { thread } = JSON.parse((await use(parent, 'thread_start', { prompt: 'child work', model: 'fake/m' })).text)
  const waited = use(parent, 'thread_wait', { thread })
  await Bun.sleep(50)
  sand.turns.interrupt(sand.sessions.require(thread))
  expect(JSON.parse((await waited).text)).toMatchObject({ thread, status: 'interrupted' })
  await Bun.sleep(100)
  expect(await heard(parent, 0)).toEqual([])
})
