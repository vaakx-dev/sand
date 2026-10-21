import type { AppStatus } from '../contract'
import { isRecord } from '@sand/util'
import { join } from 'node:path'

export type AppStatuses = Record<string, AppStatus>

const statusOf = (value: unknown): AppStatus | undefined => {
  if (!isRecord(value) || typeof value.installed !== 'boolean' || typeof value.signedIn !== 'boolean') return undefined
  const { installed, signedIn, email, plan } = value
  return { installed, signedIn, ...(typeof email === 'string' && { email }), ...(typeof plan === 'string' && { plan }) }
}

export const appStatusFile = (folder: string) => {
  const file = Bun.file(join(folder, 'status.json'))
  return {
    async read(): Promise<AppStatuses> {
      try {
        const saved: unknown = await file.json()
        if (!isRecord(saved)) return {}
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
    write: (statuses: AppStatuses) => Bun.write(file, JSON.stringify(statuses, null, 2)).then(() => {}),
  }
}
