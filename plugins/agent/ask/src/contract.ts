import type { Level, Role } from '@sand/model/contract'
import { service } from 'drydock'
import type { z } from 'zod'

interface AskBase {
  system: string
  prompt: string
  session?: string
  signal?: AbortSignal
}

export type AskRequest = AskBase & ({ role: Role } | { level: Level })

export interface Ask {
  text(request: AskRequest): Promise<string>
  json<S extends z.ZodType>(request: AskRequest, schema: S): Promise<z.infer<S>>
}

export const ask = service<Ask>('ask')
