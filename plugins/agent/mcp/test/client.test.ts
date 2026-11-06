import type { Session } from '@sand/chats/contract'
import { startSand, type Sand } from '@sand/harness'
import { tools, toolsChange } from '@sand/tools/contract'
import { afterEach, expect, test } from 'bun:test'
import { join } from 'node:path'

let sand: Sand
let chat: Session

afterEach(() => sand.stop())

const call = (name: string, input: Record<string, unknown> = {}) => ({ type: 'call', name, input }) as const

const start = async (calls: ReturnType<typeof call>[]) => {
  sand = await startSand([{ id: 'fake', models: ['m'], replies: calls.flatMap(each => [[each], [{ type: 'text', text: 'ok' }]]) }])
  sand.app.load(join(import.meta.dir, '..', 'src', 'index.ts'), {
    servers: { fixture: { command: process.execPath, args: [join(import.meta.dir, 'fixture.ts')] } },
  })
  await sand.app.settled()
  chat = sand.chat('fake/m')
  await ready()
}

const registry = () => {
  const found = sand.app.get(tools)
  if (!found) throw new Error('tools did not start')
  return found
}

const eventually = async (check: () => boolean) => {
  while (!check()) await Bun.sleep(20)
}

const toolNames = () => registry().groups().find(group => group.name === 'mcp_fixture')?.tools ?? []

const ready = () => eventually(() => toolNames().length > 0)

const nextToolsChange = () =>
  new Promise<void>(resolve => {
    const stop = sand.app.on(toolsChange, () => {
      stop()
      resolve()
    })
  })

const turn = async () => {
  await sand.turns.run(chat, 'go')
  const [result] = chat.messages().at(-2)?.content ?? []
  return result
}

const answer = (text: string, isError?: boolean) => ({ content: [{ type: 'text', text }], ...(isError && { isError }) })

test("an MCP server's tools join sand as an on-demand group, with the server's input schema, and answer calls", async () => {
  await start([call('mcp_fixture_echo', { text: 'hi' }), call('mcp_fixture_fail')])

  expect(registry().groups().find(group => group.name === 'mcp_fixture')).toMatchObject({
    chosen: 'on-demand',
    tools: ['mcp_fixture_crash', 'mcp_fixture_echo', 'mcp_fixture_fail', 'mcp_fixture_grow'],
  })
  expect(registry().specs([], chat).find(spec => spec.name === 'mcp_fixture_echo')).toMatchObject({
    description: 'Echo the text back',
    inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] },
  })
  expect(await turn()).toMatchObject(answer('echo: hi'))
  expect(await turn()).toMatchObject(answer('it broke', true))
})

test('tools a server adds later can be called once it says its list changed', async () => {
  await start([call('mcp_fixture_grow'), call('mcp_fixture_shout', { text: 'hey' })])

  expect(await turn()).toMatchObject(answer('grown'))
  await eventually(() => toolNames().includes('mcp_fixture_shout'))
  expect(await turn()).toMatchObject(answer('HEY'))
})

test('a crashed server fails only its own tool calls, then reconnects', async () => {
  await start([call('mcp_fixture_crash'), call('mcp_fixture_echo', { text: 'early' }), call('mcp_fixture_echo', { text: 'back' })])

  expect(await turn()).toMatchObject({ isError: true })
  const reconnected = nextToolsChange()
  const early = await turn()
  expect(early).toMatchObject({ isError: true })
  expect(JSON.stringify(early)).toContain('The fixture MCP server is not connected')
  await reconnected
  expect(await turn()).toMatchObject(answer('echo: back'))
})
