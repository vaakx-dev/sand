import { viaClose, viaFetch, viaOpen, viaSend } from '@sand/devices-contract'
import type { Hub } from '@sand/host-hub/contract'
import type { Dispose } from 'drydock'
import { forwardFetches } from './fetch'
import { createStreams } from './streams'

export const viaForwarder = (hub: Hub, baseOf: (pc: string) => string): (() => Dispose)[] => {
  const streams = createStreams(hub)
  const fetches = forwardFetches(hub)
  return [
    () => hub.handle(viaFetch, (input, caller) => fetches.fetchHead(baseOf(input.pc), input, caller)),
    () => hub.handle(viaOpen, ({ pc, ticket }, caller) => streams.open(baseOf(pc), ticket, caller)),
    () => hub.handle(viaSend, ({ stream, data }, caller) => streams.send(stream, data, caller)),
    () => hub.handle(viaClose, ({ stream }, caller) => (fetches.close(stream, caller) ? undefined : streams.close(stream, caller))),
    () => hub.onLeave(streams.leave),
    () => hub.onLeave(fetches.leave),
    () => streams.closeAll,
    () => fetches.closeAll,
  ]
}
