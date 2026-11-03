import type { PullRef } from '@sand/github/contract'
import { z } from 'zod'

export const linksEntry = 'pull-links'

const ref = z.object({ repo: z.string(), number: z.number().int().positive() })

const watchMark = z.object({
  head: z.string(),
  failed: z.array(z.string()),
  passed: z.string().optional(),
  red: z.boolean().optional(),
  conflict: z.boolean(),
  since: z.number(),
})

const storedLink = ref.extend({
  source: z.enum(['created', 'branch', 'linked', 'opened', 'stack']),
  linked: z.number(),
  watching: z.boolean(),
  mark: watchMark.optional(),
  quiet: z.number().int().min(0).optional(),
  ended: z.number().optional(),
})

const storedLinks = z.object({ links: z.array(storedLink), dismissed: z.array(ref), engaged: z.number().optional() })

export type WatchMark = z.infer<typeof watchMark>
export type StoredLink = z.infer<typeof storedLink>
export type StoredLinks = z.infer<typeof storedLinks>

export const noLinks: StoredLinks = { links: [], dismissed: [], engaged: 0 }

export const parseLinks = (data: unknown): StoredLinks | undefined => {
  const parsed = storedLinks.safeParse(data)
  return parsed.success ? parsed.data : undefined
}

export const refOf = ({ repo, number }: PullRef): PullRef => ({ repo, number })
