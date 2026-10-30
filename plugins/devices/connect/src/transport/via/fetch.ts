import { type TransportInit, viaFetch } from '@sand/devices-contract'
import { untilAborted } from '@sand/util'
import type { ViaRelay } from './relay'
import { viaMethodOf, viaRequestOf } from './request'
import { viaResponse } from './response'

const send = async (relay: ViaRelay, pc: string, path: string, init: TransportInit) => {
  const method = viaMethodOf(init)
  const { headers, body } = await viaRequestOf(init)
  const reply = await relay.call(viaFetch, { pc, path, method, headers, ...(body && { body }) }, { timeout: init.timeout })
  return viaResponse(reply)
}

export const fetchVia = (relay: ViaRelay, pc: string, path: string, init: TransportInit) => {
  const work = send(relay, pc, path, init)
  return init.signal ? untilAborted(work, init.signal) : work
}
