import { expect, test } from 'bun:test'
import { z } from 'zod'
import { type McpTool, toolsOn } from '../src/contract'

const input = z.object({ prompt: z.string(), pc: z.string().optional(), worktree: z.boolean().optional() })

const start: McpTool<typeof input> = {
  name: 'start',
  description: 'Start one.',
  input,
  access: 'operate',
  parts: [
    { feature: 'pcs', fields: ['pc'] },
    { feature: 'worktrees', fields: ['worktree'], description: 'Set worktree for its own checkout.' },
  ],
  run: async () => ({}),
}

const share: McpTool<typeof input> = { ...start, name: 'share', feature: 'pcs', parts: [] }

const shown = (on: string[]) => toolsOn([start, share], feature => on.includes(feature))

test('a tool shows only the options and words of the features that are on, and a tool of an off feature is left out', () => {
  const [alone, ...rest] = shown([])
  expect(rest).toEqual([])
  expect(alone!.description).toBe('Start one.')
  expect(Object.keys(alone!.input.shape)).toEqual(['prompt'])

  const all = shown(['pcs', 'worktrees'])
  expect(all.map(tool => tool.name)).toEqual(['start', 'share'])
  expect(all[0]!.description).toBe('Start one. Set worktree for its own checkout.')
  expect(Object.keys(all[0]!.input.shape)).toEqual(['prompt', 'pc', 'worktree'])
})
