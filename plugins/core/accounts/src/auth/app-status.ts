import type { AppStatus } from '../contract'
import { writeAtomic } from '@sand/util/fs'
import { join } from 'node:path'
import { z } from 'zod'

export type AppStatuses = Record<string, AppStatus>

const savedSchema = z.record(z.string(), z.unknown())

const statusSchema = z.object({
  installed: z.boolean(),
  signedIn: z.boolean(),
  email: z.string().optional().catch(undefined),
  plan: z.string().optional().catch(undefined),
})

const statusOf = (value: unknown): AppStatus | undefined => {
  const found = statusSchema.safeParse(value).data
  if (!found) return undefined
  const { installed, signedIn, email, plan } = found
  return { installed, signedIn, ...(email !== undefined && { email }), ...(plan !== undefined && { plan }) }
}

export const appStatusFile = (folder: string) => {
  const path = join(folder, 'status.json')
  const file = Bun.file(path)
  return {
    async read(): Promise<AppStatuses> {
      try {
        const saved = savedSchema.parse(await file.json())
        return Object.fromEntries(
          Object.entries(saved).flatMap(([id, value]) => {
            const found = statusOf(value)
            return found ? [[id, found] as const] : []
          }),
        )
      } catch {
        return {}
      }
    },
    write: (statuses: AppStatuses) => writeAtomic(path, JSON.stringify(statuses, null, 2)),
  }
}
