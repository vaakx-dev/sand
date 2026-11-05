import { Client } from '@modelcontextprotocol/client'
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio'
import { afterEach, expect, test } from 'bun:test'
import { join } from 'node:path'

let client: Client

afterEach(() => client.close())

const connect = async () => {
  client = new Client({ name: 'test', version: '1.0.0' })
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [join(import.meta.dir, 'serve.ts')] }))
}

const call = async (name: string, input: Record<string, unknown>) => {
  const { content, isError } = await client.callTool({ name, arguments: input })
  const [first] = content
  if (first?.type !== 'text') throw new Error(`${name} answered without text`)
  return { isError: Boolean(isError), value: JSON.parse(first.text) }
}

test('an outside agent starts a thread over stdio, waits for its reply, reads it, and gets typed errors', async () => {
  await connect()
  const { tools } = await client.listTools()
  expect(tools.map(tool => tool.name).sort()).toEqual(['thread_list', 'thread_read', 'thread_send', 'thread_start', 'thread_stop', 'thread_wait'])

  const started = await call('thread_start', { prompt: 'ping', model: 'fake/m', clientRequestId: 'once' })
  expect(started).toEqual({ isError: false, value: { thread: expect.any(String), disposition: 'started', turn: expect.any(String) } })
  expect(await call('thread_start', { prompt: 'ping', model: 'fake/m', clientRequestId: 'once' })).toEqual(started)
  const { thread } = started.value

  expect(await call('thread_wait', { thread })).toEqual({ isError: false, value: { thread, turn: started.value.turn, status: 'completed', reply: 'pong' } })
  expect((await call('thread_read', { thread })).value.items.map(({ role, text }: { role: string; text: string }) => [role, text])).toEqual([
    ['user', 'ping'],
    ['assistant', 'pong'],
  ])
  expect(await call('thread_send', { thread: 'missing', prompt: 'hello' })).toEqual({
    isError: true,
    value: { error: { code: 'not_found', message: 'No thread missing' } },
  })
})
