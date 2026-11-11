import type { PcIdentity, Route } from '@sand/devices-contract'
import type { Hello } from '@sand/host-hub/contract'
import type { Link } from '../link/link'
import { probeTimeout } from '../timing'
import type { DialContext, DialRun } from './context'
import type { PassedProbe } from './probe'
import { claimedSocketPath, openSocket, ticketSocketPath } from './socket'
import { requestTicket } from './ticket'

export interface Opened {
  link: Link
  hello: Hello
  route: Route
  identity: PcIdentity
  ms: number
}

const socketPath = async (probe: PassedProbe, context: DialContext) => {
  if (probe.claim && probe.route.via === undefined) return claimedSocketPath(await probe.claim)
  const grant = await requestTicket(context.transportOf(probe.route), context.signer, probe.identity.id, probe.nonce, probeTimeout(probe.route))
  return ticketSocketPath(grant.ticket)
}

export const openRoute = async (probe: PassedProbe, context: DialContext, run: DialRun): Promise<Opened> => {
  const { link, hello } = await openSocket(probe.route, await socketPath(probe, context), context, run)
  return { link, hello, route: probe.route, identity: probe.identity, ms: probe.ms }
}
