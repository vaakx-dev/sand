import type { TicketRefusal } from '@sand/devices-contract'
import { lazy } from '@sand/util'
import { z } from 'zod'

const refusalSchema = lazy(() => z.object({ reason: z.enum(['removed', 'unknown', 'nonce']) }))

export const isRefusal = (value: unknown): value is TicketRefusal => refusalSchema().safeParse(value).success

export class AccessRefused extends Error {
  override readonly name = 'AccessRefused'

  constructor(readonly refusal: TicketRefusal) {
    super(`refused access (${refusal.reason})`)
  }
}
