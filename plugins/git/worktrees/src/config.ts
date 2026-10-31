import { z } from 'zod'

export const config = z.object({
  folder: z.string().default('~/.sand/worktrees'),
  prefix: z.string().default('sand/'),
})
