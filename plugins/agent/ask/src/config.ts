import { z } from 'zod'

export const config = z.object({
  model: z.string().optional(),
})

export type AskConfig = z.output<typeof config>
