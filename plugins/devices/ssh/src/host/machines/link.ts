import type { Answers } from '../askpass/answers'
import { destinationOf } from '../hosts/target'
import { freeLocalPort } from '../remote/ports'
import { ensureRunning, remotePort, type Session } from '../remote/session'
import { openTunnel } from '../remote/tunnel'
import type { Ssh } from '../ssh/run'
import type { Secrets } from './secrets'
import type { Machine, Store } from './store'
import type { OpenLink } from './supervisor'

export interface LinkDeps {
  ssh: Ssh
  store: Store
  secrets: Secrets
  localPort(): number
}

export const openLink = async ({ ssh, store, secrets, localPort }: LinkDeps, machine: Machine, answers: Answers, signal: AbortSignal): Promise<OpenLink> => {
  const session: Session = { ssh, destination: destinationOf(machine.host), answers, signal }
  const server = await ensureRunning(session, machine.platform)
  if (!server) throw new Error(`sand is no longer installed on ${machine.name}; remove it and add it again`)
  const lport = freeLocalPort(machine.lport)
  const tunnel = await openTunnel(session, { lport, rport: machine.rport, remote: remotePort(server), local: localPort() })
  if (tunnel.identity.id !== machine.pc) {
    tunnel.close()
    throw new Error(`${machine.name} now runs a different sand (${tunnel.identity.name})`)
  }
  if (tunnel.lport !== machine.lport || tunnel.rport !== machine.rport) await store.put({ ...machine, lport: tunnel.lport, rport: tunnel.rport })
  await secrets.keep(machine.pc, answers.kept())
  return tunnel
}
