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

test('an outside agent over stdio sees the registered tools with their hints, runs them where it is, and gets typed errors', async () => {
  await connect()
  const { tools } = await client.listTools()
  expect(Object.fromEntries(tools.map(tool => [tool.name, tool.annotations?.readOnlyHint ?? false]))).toEqual({ list: true, stop: false, here: true })

  expect(await call('here', {})).toEqual({ isError: false, value: { here: import.meta.dir } })
  expect(await call('list', {})).toEqual({ isError: false, value: [] })
  expect(await call('stop', { thread: 'missing' })).toEqual({
    isError: true,
    value: { error: { code: 'not_found', message: 'No thread missing' } },
  })
})
