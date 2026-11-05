import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client'
import type { AgentVerdict } from '@sand/devices-contract'
import { startSand, type Sand } from '@sand/harness'
import { afterAll, beforeAll, expect, test } from 'bun:test'
import { agentEndpoint } from '../src/http/endpoint'

const agents = new Map<string, AgentVerdict>([
  ['reader-token', { caller: { device: 'reader', kind: 'agent' }, name: 'Reader', access: 'read' }],
  ['worker-token', { caller: { device: 'worker', kind: 'agent' }, name: 'Worker', access: 'operate' }],
])

let sand: Sand
let server: Bun.Server<undefined>

beforeAll(async () => {
  sand = await startSand([{ id: 'fake', models: ['m'], replies: [[{ type: 'text', text: 'pong' }]] }])
  const endpoint = agentEndpoint(
    token => agents.get(token),
    caller => work => work(sand.askAs(caller)),
  )
  server = Bun.serve({ port: 0, fetch: endpoint })
})

afterAll(async () => {
  await server.stop()
  await sand.stop()
})

const connect = async (token: string) => {
  const client = new Client({ name: 'test', version: '1.0.0' })
  await client.connect(new StreamableHTTPClientTransport(new URL(server.url), { requestInit: { headers: { authorization: `Bearer ${token}` } } }))
  return client
}

const call = async (client: Client, name: string, input: Record<string, unknown>) => {
  const { content, isError } = await client.callTool({ name, arguments: input })
  const [first] = content
  if (first?.type !== 'text') throw new Error(`${name} answered without text`)
  return { isError: Boolean(isError), value: JSON.parse(first.text) }
}

test('a paired agent over HTTP reads threads, a read-only one is denied writes, and an unknown token is turned away', async () => {
  expect((await fetch(server.url, { method: 'POST', headers: { authorization: 'Bearer nobody' } })).status).toBe(401)

  const worker = await connect('worker-token')
  const started = await call(worker, 'thread_start', { prompt: 'ping', model: 'fake/m', cwd: sand.home })
  expect(started.isError).toBe(false)
  const { thread } = started.value
  expect(await call(worker, 'thread_wait', { thread })).toMatchObject({ isError: false, value: { status: 'completed', reply: 'pong' } })
  expect(sand.turns.get(started.value.turn)?.origin).toBe('mcp')

  const reader = await connect('reader-token')
  expect((await call(reader, 'thread_list', {})).value).toEqual([expect.objectContaining({ thread, status: 'completed' })])
  expect(await call(reader, 'thread_send', { thread, prompt: 'again' })).toEqual({
    isError: true,
    value: { error: { code: 'denied', message: expect.stringContaining('may only read') } },
  })
  expect((await call(reader, 'thread_read', { thread })).value.items).toHaveLength(2)

  await Promise.all([worker.close(), reader.close()])
})
