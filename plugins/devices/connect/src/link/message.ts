import type { ServerMessage } from '@sand/host-hub/contract'
import { lazy } from '@sand/util'
import { z } from 'zod'

const messageSchema = lazy(() =>
  z.union([
    z.object({ type: z.literal('event'), name: z.string(), payload: z.unknown() }),
    z.object({ type: z.literal('result'), id: z.number(), error: z.string() }),
    z.object({ type: z.literal('result'), id: z.number(), result: z.unknown() }),
  ]),
)

const parsed = (raw: string): unknown => {
  try {
    return JSON.parse(raw)
  } catch {
    return undefined
  }
}

export const parseServerMessage = (raw: string): ServerMessage | undefined => messageSchema().safeParse(parsed(raw)).data
