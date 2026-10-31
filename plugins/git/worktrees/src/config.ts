import { z } from 'zod'

export const config = z.object({
  folder: z.string().optional(),
  prefix: z.string().default('sand/'),
})
