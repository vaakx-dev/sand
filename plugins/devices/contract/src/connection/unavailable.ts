import type { ConnectionStatus } from './status'

export class PcUnavailable extends Error {
  override readonly name = 'PcUnavailable'

  constructor(
    readonly pc: string,
    readonly pcName: string,
    readonly status: ConnectionStatus,
  ) {
    super(`${pcName} isn't connected`)
  }
}

export const isPcUnavailable = (error: unknown): error is PcUnavailable => error instanceof PcUnavailable
