import { deviceParams, devicePaths, type PcIdentity, type Route } from '@sand/devices-contract'
import { type Hello, hello } from '@sand/host-hub/contract'
import { type Link, openLink } from '../link/link'
import { callTimeout, probeTimeout } from '../timing'
import type { DialContext } from './context'
import type { PassedProbe } from './probe'
import { requestTicket } from './ticket'

export interface Opened {
  link: Link
  hello: Hello
  route: Route
  identity: PcIdentity
  ms: number
}

const socketPath = (ticket: string) => `${devicePaths.socket}?${deviceParams.ticket}=${encodeURIComponent(ticket)}`

export const openRoute = async (probe: PassedProbe, context: DialContext): Promise<Opened> => {
  const { route } = probe
  const transport = context.transportOf(route)
  const timeout = probeTimeout(route)
  const grant = await requestTicket(transport, context.signer, probe.identity.id, probe.nonce, timeout)
  const link = await openLink(route, transport, socketPath(grant.ticket), timeout, context.listener)
  try {
    const reply = await link.call(hello, context.greeting(), callTimeout)
    return { link, hello: reply, route, identity: probe.identity, ms: probe.ms }
  } catch (error) {
    link.close()
    throw error
  }
}
