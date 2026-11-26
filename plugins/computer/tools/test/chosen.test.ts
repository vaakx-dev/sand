import { botCreate, type ChosenComputer } from '@sand/bots/contract'
import { textOf } from '@sand/chats/contract'
import { type Computer, type ComputerKind, computers } from '@sand/computers/contract'
import { startSand, type Sand } from '@sand/harness'
import { tools, type ToolContext } from '@sand/tools/contract'
import { afterEach, expect, test } from 'bun:test'

let sand: Sand

afterEach(() => sand.stop())

const fake = (id: string, kind: ComputerKind, acted: string[]): Computer => ({
  info: { id, kind, label: id, os: 'windows' },
  screenshot: async () => ({ width: 1, height: 1, png: new Uint8Array() }),
  elements: async () => [],
  act: async () => void acted.push(id),
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

test("a chat keeps the computer it last named, else uses its bot's choice, else the only browser, and is told to name one when there are more", async () => {
  sand = await startSand([], { plugins: ['bots/bots', 'bots/turns', 'computer/computers', 'computer/tools'] })
  const acted: string[] = []
  const registry = sand.app.get(computers)!
  registry.register(fake('browser', 'browser', acted))
  registry.register(fake('desktop', 'desktop', acted))
  const toolbox = sand.app.get(tools)!
  await toolbox.choose('computer', 'always')
  const act = async (on: ToolContext['conversation'], computer?: string) => {
    const call = { type: 'tool_call', id: Bun.randomUUIDv7(), name: 'computer_act', input: { action: { type: 'wait', ms: 0 }, screenshot: false, ...(computer && { computer }) } } as const
    const result = await toolbox.run(call, { cwd: sand.home, signal: new AbortController().signal, conversation: on, turn: 't', progress() {}, wait: () => () => {} })
    return textOf(result.content)
  }
  const agentOf = (parent: string) => sand.sessions.agent({ parent, cwd: sand.home, title: 'Agent' }).id
  const botAgent = async (computer: ChosenComputer) => conversation('thread', agentOf((await sand.ask(botCreate, { name: computer, computer })).id))

  expect(await act(await botAgent('this-pc'))).toBe('Done: wait.')
  expect(await act(await botAgent('own'))).toBe('Done: wait.')
  expect(await act(await botAgent('own'), 'desktop')).toBe('Done: wait.')
  expect(acted).toEqual(['desktop', 'browser', 'desktop'])

  const lead = (await sand.ask(botCreate, { name: 'Lead', computer: 'this-pc' })).id
  expect(await act(conversation('thread', agentOf(agentOf(lead))))).toBe('Done: wait.')
  expect(acted.at(-1)).toBe('desktop')

  const named = await botAgent('own')
  expect(await act(named, 'desktop')).toBe('Done: wait.')
  expect(await act(named, 'nowhere')).toContain('No computer "nowhere"')
  expect(await act(named)).toBe('Done: wait.')
  expect(acted.at(-1)).toBe('desktop')

  const plain = conversation('thread', agentOf(sand.sessions.thread(sand.home).id))
  expect(await act(plain)).toBe('Done: wait.')
  expect(acted.at(-1)).toBe('browser')

  registry.register(fake('second', 'browser', acted))
  expect(await act(conversation('thread', 'chat'))).toContain('Name a computer')
  expect(await act(plain)).toContain('Name a computer')
  expect(await act(plain, 'second')).toBe('Done: wait.')
  expect(await act(plain)).toBe('Done: wait.')
  expect(acted.at(-1)).toBe('second')
})
