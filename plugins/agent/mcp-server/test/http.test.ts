import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client'
import type { AgentVerdict } from '@sand/devices-contract'
import { startSand, type Sand } from '@sand/harness'
import { afterAll, beforeAll, expect, test } from 'bun:test'
import { agentEndpoint } from '../src/http/endpoint'
import { testTools } from './tools'

const agents = new Map<string, AgentVerdict>([
  ['reader-token', { caller: { device: 'reader', kind: 'agent' }, name: 'Reader', access: 'read' }],
  ['worker-token', { caller: { device: 'worker', kind: 'agent' }, name: 'Worker', access: 'operate' }],
])

let sand: Sand
let server: Bun.Server<undefined>

beforeAll(async () => {
  sand = await startSand([{ id: 'fake', models: ['m'], replies: [] }])
  const endpoint = agentEndpoint(
    token => agents.get(token),
    caller => work => work(sand.askAs(caller)),
    () => testTools,
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

test('a paired agent over HTTP uses the registered tools, a read-only one is denied operate tools, and an unknown token is turned away', async () => {
  expect((await fetch(server.url, { method: 'POST', headers: { authorization: 'Bearer nobody' } })).status).toBe(401)

  const worker = await connect('worker-token')
  expect(await call(worker, 'stop', { thread: 'missing' })).toEqual({
    isError: true,
    value: { error: { code: 'not_found', message: 'No thread missing' } },
  })

  const reader = await connect('reader-token')
  expect(await call(reader, 'list', {})).toEqual({ isError: false, value: [] })
  expect(await call(reader, 'stop', { thread: 'missing' })).toEqual({
    isError: true,
    value: { error: { code: 'denied', message: expect.stringContaining('may only read') } },
  })

  await Promise.all([worker.close(), reader.close()])
})
