import { z } from 'zod'

export const config = z.object({
  ratio: z.number().gt(0).max(1).default(0.9),
  reserve: z.number().int().min(0).default(20_000),
  keep: z.number().int().positive().default(20_000),
  max_context: z.number().int().positive().optional(),
  instructions: z.string().optional(),
})

export type CompactionConfig = z.output<typeof config>
