import { type Dispose, service } from 'drydock'
import type { Signer } from '../connection/engine'
import type { PcIdentity } from '../records'

export interface ThisPc {
  readonly id: string
  readonly publicKey: string
  readonly platform: string
  readonly signer: Signer
  name(): string
  identity(): Promise<PcIdentity>
  rename(name: string): Promise<PcIdentity>
  onRename(listener: (identity: PcIdentity) => void): Dispose
}

export const thisPc = service<ThisPc>('thisPc')
