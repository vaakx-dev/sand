import type { PcIdentity, ResumeStore, Route, Signer, Transport } from '@sand/devices-contract'
import type { hello, InputOf } from '@sand/host-hub/contract'
import type { LinkListener } from '../link/link'
import type { ExpectedPc } from './proof'

export interface DialContext {
  signer: Signer
  expected(): ExpectedPc
  transportOf(route: Route): Transport
  greeting(): InputOf<typeof hello>
  identified(identity: PcIdentity): void
  listener: LinkListener
  resume: ResumeStore
}

export interface DialRun {
  stopped: boolean
  greeting?(route: Route): void
}
