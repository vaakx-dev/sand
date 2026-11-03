import type { Effort, Speed } from '@sand/accounts/contract'
import { service } from 'drydock'
import type { z } from 'zod'

export interface AskRequest {
  system: string
  prompt: string
  model: string
  effort?: Effort
  speed?: Speed
  session?: string
  signal?: AbortSignal
}

export interface Ask {
  text(request: AskRequest): Promise<string>
  json<S extends z.ZodType>(request: AskRequest, schema: S): Promise<z.infer<S>>
}

export const ask = service<Ask>('ask')
