import { textOf } from '@sand/chats/contract'
import { computers, type Computer } from '@sand/computers/contract'
import { startSand, type Sand } from '@sand/harness'
import { tools, type ToolContext } from '@sand/tools/contract'
import { afterAll, beforeAll, expect, test } from 'bun:test'

let sand: Sand

const desktop = () => {
  let clicks = 0
  let drawn = 0
  const computer: Computer = {
    info: { id: 'desktop', kind: 'desktop', label: 'Desktop', os: 'windows' },
    screenshot: async () => ({ width: drawn + 1, height: 1, png: new Uint8Array() }),
    elements: async () => [{ ref: 'e1', role: 'button', name: 'Save', box: { left: 0, top: 0, right: 0.5, bottom: 0.5 } }],
    act: async () => void clicks++,
    settle: async () => void (drawn = clicks),
  }
  return computer
}

const run = async (name: string, input: Record<string, unknown>) => {
  const conversation: ToolContext['conversation'] = {
    id: 'chat',
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

test('an action shows the settled screen unless told not to', async () => {
  const click = { type: 'click', at: { x: 0.5, y: 0.5 } }
  expect(await run('computer_act', { action: click })).toBe('Done: click.\n2×1 pixels.')
  expect(await run('computer_act', { action: click, screenshot: false })).toBe('Done: click.')
  expect(await run('computer_act', { action: click })).toBe('Done: click.\n4×1 pixels.')
})

test('a computer that cannot find text says so and still lists its elements', async () => {
  const listed = await run('computer_elements', { find: 'Total' })
  expect(listed).toContain('cannot find text')
  expect(listed).toEndWith('\ne1 button "Save" [0.000, 0.000, 0.500, 0.500]')
})
