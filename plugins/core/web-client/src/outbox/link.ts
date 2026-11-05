import type { Wire } from '@sand/devices-contract'
import type { InputOf } from '@sand/host-hub/contract'
import { helloTurnsApi, type SendResult, turnSend } from '@sand/turns-contract/contract'

export interface Link {
  ready(pc: string): boolean
  turnsApi(pc: string): boolean
  send(pc: string, input: InputOf<typeof turnSend>): Promise<SendResult>
}

export const wireLink = (wire: Wire): Link => ({
  ready: pc => wire.ready(pc),
  turnsApi: pc => Boolean(wire.hello(helloTurnsApi, pc)),
  send: (pc, input) => wire.call(turnSend, input, pc),
})
