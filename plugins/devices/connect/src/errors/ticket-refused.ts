import type { TicketRefusal } from '@sand/devices-contract'

export class TicketRefused extends Error {
  override readonly name = 'TicketRefused'

  constructor(readonly refusal: TicketRefusal) {
    super(`refused a ticket (${refusal.reason})`)
  }
}
