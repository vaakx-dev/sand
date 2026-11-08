import type { PcIdentity } from '@sand/devices-contract'
import { cancelled, sshFailure } from '../ssh/failure'
import type { SshResult } from '../ssh/run'
import { sshErrorText } from '../ssh/text'
import { reachIdentity } from './identity'
import { randomRemotePort } from './ports'
import { type Session, spawnRemote } from './session'

interface Ports {
  lport: number
  rport: number
}

interface Tunnel extends Ports {
  identity: PcIdentity
  closed: Promise<string>
  close(): void
}

interface TunnelEnds extends Ports {
  remote: number
  local: number
}

const portTries = 3
const answerWait = 10 * 60_000

export const remotePortTaken = (result: SshResult) => /remote port forwarding failed/i.test(result.stderr)

const closedText = (result: SshResult) => sshErrorText(result.stderr, []) || 'The SSH connection closed'

export const openTunnel = async (session: Session, ends: TunnelEnds): Promise<Tunnel> => {
  const { lport, remote, local } = ends
  let { rport } = ends
  for (let tries = 1; ; tries++) {
    const process = spawnRemote(session, {}, { forwards: ['-L', `${lport}:127.0.0.1:${remote}`, '-R', `${rport}:127.0.0.1:${local}`] })
    const polling = AbortSignal.any([AbortSignal.timeout(answerWait), ...(session.signal ? [session.signal] : [])])
    const stop = new AbortController()
    const outcome = await Promise.race([
      process.exited.then(result => ({ result })),
      reachIdentity(`http://127.0.0.1:${lport}`, AbortSignal.any([polling, stop.signal])).then(identity => ({ identity })),
    ])
    stop.abort()
    if ('result' in outcome) {
      if (!remotePortTaken(outcome.result) || tries === portTries) throw sshFailure(outcome.result, session.answers, session.signal)
      rport = randomRemotePort()
      continue
    }
    if (outcome.identity) return { lport, rport, identity: outcome.identity, closed: process.exited.then(closedText), close: process.kill }
    process.kill()
    throw session.signal?.aborted ? cancelled() : new Error("sand on that machine doesn't answer through the SSH tunnel")
  }
}
