import { unanswered } from '@sand/host-hub/contract'
import type { ConnectionStatus } from './status'

type Reason = 'disconnected' | 'unsupported'

export interface UnavailablePc {
  pc: string
  name: string
  status: ConnectionStatus
  reason: Reason
}

const messages: Record<Reason, (name: string) => string> = {
  disconnected: name => `${name} isn't connected`,
  unsupported: name => `${name} can't do this on the sand version it runs`,
}

export class PcUnavailable extends Error {
  override readonly name = 'PcUnavailable'

  constructor(readonly unavailable: UnavailablePc) {
    super(messages[unavailable.reason](unavailable.name))
  }
}

export const isPcUnavailable = (error: unknown): error is PcUnavailable => error instanceof PcUnavailable

export const peerError = (error: unknown, pc: Omit<UnavailablePc, 'reason'>) => (unanswered(error) ? new PcUnavailable({ ...pc, reason: 'unsupported' }) : error)
