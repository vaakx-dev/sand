import { z } from 'zod'

const step = z.object({
  id: z.string(),
  label: z.string(),
  state: z.enum(['wait', 'run', 'ok', 'fail', 'skip']),
  output: z.string().optional(),
  copy: z.string().optional(),
  run: z.string().optional(),
})

const setup = z.object({
  path: z.string(),
  session: z.string().optional(),
  steps: z.array(step),
  done: z.boolean(),
  failed: z.boolean(),
})

const record = z.object({
  id: z.string(),
  path: z.string(),
  main: z.string(),
  branch: z.string().optional(),
  base: z.string().optional(),
  head: z.string().optional(),
  sessions: z.array(z.string()),
  created: z.number(),
  removed: z.number().optional(),
  temp: z.string().optional(),
  adopted: z.literal(true).optional(),
  setup: setup.optional(),
})

export const storedSchema = z.object({
  worktrees: z.record(z.string(), record).default({}),
  defaults: z.record(z.string(), z.object({ kind: z.enum(['checkout', 'worktree']) })).default({}),
})

export type PlannedStep = z.infer<typeof step>
export type StoredSetup = z.infer<typeof setup>
export type WorktreeRecord = z.infer<typeof record>
export type Stored = z.infer<typeof storedSchema>
