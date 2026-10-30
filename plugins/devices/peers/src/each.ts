import type { CallOptions, PeerOutcome } from '@sand/devices-contract'
import type { Request } from '@sand/host-hub/contract'

type Call = <I, O>(pc: string, request: Request<I, O>, input: I, options?: CallOptions) => Promise<O>

export const callEachOf =
  (connected: () => string[], call: Call) =>
  <I, O>(request: Request<I, O>, input: I, options?: CallOptions): Promise<PeerOutcome<O>[]> =>
    Promise.all(
      connected().map(pc =>
        call(pc, request, input, options).then(
          value => ({ pc, ok: true as const, value }),
          (error: unknown) => ({ pc, ok: false as const, error }),
        ),
      ),
    )
