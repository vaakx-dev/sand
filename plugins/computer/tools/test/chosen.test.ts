import { botCreate, type Computer as Choice } from '@sand/bots/contract'
import { textOf } from '@sand/chats/contract'
import { type Computer, computers } from '@sand/computers/contract'
import { startSand, type Sand } from '@sand/harness'
import { tools, type ToolContext } from '@sand/tools/contract'
import { afterEach, expect, test } from 'bun:test'

let sand: Sand

afterEach(() => sand.stop())

const fake = (id: string, acted: string[]): Computer => ({
  info: { id, kind: 'desktop', label: id, os: 'windows' },
  screenshot: async () => ({ width: 1, height: 1, png: new Uint8Array() }),
  elements: async () => [],
  act: async () => void acted.push(id),
  settle: async () => {},
})

const conversation = (owner: 'thread' | 'bot', id: string): ToolContext['conversation'] => ({
  id,
  owner,
  cwd: sand.home,
  append() {
    throw new Error('Tests only read this conversation')
  },
  path: () => [],
  entries: () => [],
})

test("an agent of a bot acts on the bot's chosen computer unless it names one, and with none chosen it is told how to choose", async () => {
  sand = await startSand([], { plugins: ['bots/bots', 'bots/turns', 'computer/computers', 'computer/tools'] })
  const acted: string[] = []
  for (const id of ['browser', 'desktop']) sand.app.get(computers)!.register(fake(id, acted))
  const registry = sand.app.get(tools)!
  await registry.choose('computer', 'always')
  const act = async (on: ToolContext['conversation'], computer?: string) => {
    const call = { type: 'tool_call', id: Bun.randomUUIDv7(), name: 'computer_act', input: { action: { type: 'wait', ms: 0 }, screenshot: false, ...(computer && { computer }) } } as const
    const result = await registry.run(call, { cwd: sand.home, signal: new AbortController().signal, conversation: on, turn: 't', progress() {}, wait: () => () => {} })
    return textOf(result.content)
  }
  const agentOf = (parent: string) => sand.sessions.agent({ parent, cwd: sand.home, title: 'Agent' }).id
  const botAgent = async (computer: Choice) => conversation('thread', agentOf((await sand.ask(botCreate, { name: computer, computer })).id))

  expect(await act(await botAgent('this-pc'))).toBe('Done: wait.')
  expect(await act(await botAgent('own'))).toBe('Done: wait.')
  expect(await act(await botAgent('own'), 'desktop')).toBe('Done: wait.')
  expect(acted).toEqual(['desktop', 'browser', 'desktop'])

  const lead = (await sand.ask(botCreate, { name: 'Lead', computer: 'this-pc' })).id
  expect(await act(conversation('thread', agentOf(agentOf(lead))))).toBe('Done: wait.')
  expect(acted.at(-1)).toBe('desktop')

  expect(await act(await botAgent('none'))).toContain('You have no computer chosen. The user picks one under Computer in your profile')
  expect(await act(await botAgent('none'), 'browser')).toBe('Done: wait.')
  expect(await act(conversation('thread', agentOf(sand.sessions.thread(sand.home).id)))).toContain('Name a computer')
  expect(await act(conversation('thread', 'chat'))).toContain('Name a computer')
})
