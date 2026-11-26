import { textOf } from '@sand/chats/contract'
import { computers, type Action, type Box, type Computer } from '@sand/computers/contract'
import { startSand, type Sand } from '@sand/harness'
import { tools, type ToolContext } from '@sand/tools/contract'
import { afterAll, beforeAll, expect, test } from 'bun:test'

let sand: Sand

const acted: Action[] = []

let shown: Box = { left: 0, top: 0, right: 0.5, bottom: 0.5 }

const desktop = () => {
  let clicks = 0
  const computer: Computer = {
    info: { id: 'desktop', kind: 'desktop', label: 'Desktop', os: 'windows' },
    screenshot: async () => ({ width: clicks + 1, height: 1, png: new Uint8Array() }),
    elements: async () => [
      { ref: 'e1', role: 'button', name: 'Save', box: shown },
      { ref: 'e2', role: 'textbox', name: 'Notes', value: 'Saved drafts', box: { left: 0, top: 0.6, right: 0.5, bottom: 0.7 } },
      { ref: 'e3', role: 'link', name: 'Help', href: 'https://example.com/help', box: { left: 0, top: 0.8, right: 0.5, bottom: 0.9 } },
    ],
    act: async action => {
      acted.push(action)
      clicks++
      return undefined
    },
    read: async () => 'Lorem ipsum. '.repeat(2000),
  }
  return computer
}

const run = async (name: string, input: Record<string, unknown>, chat = 'chat') => {
  const conversation: ToolContext['conversation'] = {
    id: chat,
    owner: 'thread',
    cwd: sand.home,
    append() {
      throw new Error('Tests only read this conversation')
    },
    path: () => [],
    entries: () => [],
  }
  const call = { type: 'tool_call', id: Bun.randomUUIDv7(), name, input: { computer: 'desktop', ...input } } as const
  const result = await sand.app.get(tools)!.run(call, { cwd: sand.home, signal: new AbortController().signal, conversation, turn: 't', progress() {}, wait: () => () => {} })
  return textOf(result.content)
}

beforeAll(async () => {
  sand = await startSand([], { plugins: ['computer/computers', 'computer/tools'] })
  sand.app.get(computers)!.register(desktop())
  await sand.app.get(tools)!.choose('computer', 'always')
})

afterAll(() => sand.stop())

test('an action shows the screen after it unless told not to', async () => {
  const click = { type: 'click', at: { x: 0.5, y: 0.5 } }
  expect(await run('computer_act', { action: click })).toBe('Done: click.\n2×1 pixels.')
  expect(await run('computer_act', { action: click, screenshot: false })).toBe('Done: click.')
  expect(await run('computer_act', { action: click })).toBe('Done: click.\n4×1 pixels.')
})

test('elements show field values and link URLs', async () => {
  const listed = await run('computer_elements', {})
  expect(listed.split('\n')).toEqual([
    'e1 button "Save" [0.000, 0.000, 0.500, 0.500]',
    'e2 textbox "Notes" = "Saved drafts" [0.000, 0.600, 0.500, 0.700]',
    'e3 link "Help" → https://example.com/help [0.000, 0.800, 0.500, 0.900]',
  ])
})

test('a computer that cannot find text says so and lists only the elements whose name or value match', async () => {
  const lines = (await run('computer_elements', { find: 'save' })).split('\n')
  expect(lines[0]).toContain('cannot find text')
  expect(lines.slice(2).map(line => line.split(' ')[0])).toEqual(['e1', 'e2'])
})

test('reading long text comes in pages that pick up where the last stopped', async () => {
  const first = await run('computer_read', {})
  expect(first).toEndWith('\n\n[Characters 0–20000 of 26000. Pass offset 20000 for more.]')
  const rest = await run('computer_read', { offset: 20_000 })
  expect(rest).toEndWith('\n\n[Characters 20000–26000 of 26000.]')
  expect(first.split('\n\n[')[0]! + rest.split('\n\n[')[0]!).toBe('Lorem ipsum. '.repeat(2000))
})

test('each chat acts on the refs from its own last list, even when another chat lists the same computer since', async () => {
  const click = { type: 'click', at: { ref: 'e1' } }
  shown = { left: 0, top: 0, right: 0.5, bottom: 0.5 }
  await run('computer_elements', {}, 'first')
  shown = { left: 0.5, top: 0.5, right: 1, bottom: 1 }
  await run('computer_elements', {}, 'second')
  await run('computer_act', { action: click, screenshot: false }, 'first')
  await run('computer_act', { action: click, screenshot: false }, 'second')
  expect(acted.slice(-2).map(action => 'at' in action && action.at)).toEqual([
    { x: 0.25, y: 0.25 },
    { x: 0.75, y: 0.75 },
  ])
  expect(await run('computer_act', { action: click }, 'third')).toContain('No element e1')
})
