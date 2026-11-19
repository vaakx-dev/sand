import type { CallOptions } from '@sand/devices-contract'
import type { Request, WireEvent } from '@sand/host-hub/contract'
import type { Dispose } from 'drydock'

export interface ViaRelay {
  call<I, O>(request: Request<I, O>, input: I, options?: CallOptions): Promise<O>
  on<P>(event: WireEvent<P>, listener: (payload: P) => void): Dispose
}
