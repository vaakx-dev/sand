import type { TicketRefusal } from '@sand/devices-contract'
import { isRecord } from '@sand/util'

const refusalReasons = ['removed', 'unknown', 'nonce']

export const isRefusal = (value: unknown): value is TicketRefusal =>
  isRecord(value) && typeof value.reason === 'string' && refusalReasons.includes(value.reason)

export class AccessRefused extends Error {
  override readonly name = 'AccessRefused'

  constructor(readonly refusal: TicketRefusal) {
    super(`refused access (${refusal.reason})`)
  }
}
