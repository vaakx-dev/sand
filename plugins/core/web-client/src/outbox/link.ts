import type { Wire } from '@sand/devices-contract'
import type { InputOf } from '@sand/host-hub/contract'
import { type Sent, threadSend } from '@sand/orchestrator/contract'

export interface Link {
  ready(pc: string): boolean
  send(pc: string, input: InputOf<typeof threadSend>): Promise<Sent>
}

export const wireLink = (wire: Wire): Link => ({
  ready: pc => wire.ready(pc),
  send: (pc, input) => wire.call(threadSend, input, pc),
})
