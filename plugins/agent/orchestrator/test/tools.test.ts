import { type Session, textOf } from '@sand/chats/contract'
import { startSand, type Sand } from '@sand/harness'
import { tools } from '@sand/tools/contract'
import { afterEach, expect, test } from 'bun:test'

let sand: Sand

afterEach(() => sand.stop())

const start = async () => {
  sand = await startSand([{ id: 'fake', models: ['m'], replies: [[{ type: 'text', text: 'child done' }]] }], {
    plugins: ['core/watch', 'agent/jobs', 'agent/subagents'],
  })
}

const agent = (depth: number) => {
  const chat = sand.chat('fake/m')
  chat.append('agent', { name: 'general', depth, tools: ['threads_start', 'threads_send', 'threads_wait'] })
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

  const started = await use(parent, 'threads_start', { prompt: 'child work', model: 'fake/m' })
  expect(started.isError).toBe(false)
  const sent = JSON.parse(started.text)
  expect(sand.sessions.require(sent.thread).latest('agent')?.data).toEqual({ name: 'thread', depth: 3, tools: ['threads_start', 'threads_send', 'threads_wait'] })
  expect(sand.turns.get(sent.turn)?.origin).toBe('agent')

  const waited = await use(parent, 'threads_wait', { thread: sent.thread })
  expect(JSON.parse(waited.text)).toMatchObject({ thread: sent.thread, status: 'completed', reply: 'child done' })
})

test('an agent can neither start a thread past the deepest nesting nor message a thread with wider tools', async () => {
  await start()
  const wide = sand.chat('fake/m')

  expect(await use(agent(6), 'threads_start', { prompt: 'too deep' })).toEqual({ isError: true, text: expect.stringContaining('only nest 6 levels deep') })
  expect(await use(agent(1), 'threads_send', { thread: wide.id, prompt: 'do more' })).toEqual({
    isError: true,
    text: expect.stringContaining("you can't message it"),
  })
  expect(sand.sessions.list().filter(chat => chat.kind === 'thread')).toHaveLength(3)
})
