import { z } from 'zod'

export const configSchema = z.object({
  location: z.string().default('{drive}/worktrees/{repo}/{name}'),
  auto_settle: z.boolean().default(true),
})

export type WorktreesConfig = z.infer<typeof configSchema>
