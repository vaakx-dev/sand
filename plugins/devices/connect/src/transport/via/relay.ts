import type { CallOptions, ViaFrame } from '@sand/devices-contract'
import type { Request } from '@sand/host-hub/contract'
import type { Dispose } from 'drydock'

export interface ViaRelay {
  call<I, O>(request: Request<I, O>, input: I, options?: CallOptions): Promise<O>
  frames(listener: (frame: ViaFrame) => void): Dispose
}
