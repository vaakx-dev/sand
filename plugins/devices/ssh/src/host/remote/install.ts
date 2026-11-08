import type { InstallGrant, InstallPlatform } from '@sand/devices-contract'
import { sshFailure } from '../ssh/failure'
import { randomRemotePort } from './ports'
import { installCommand } from './scripts'
import { type Session, spawnRemote } from './session'
import { remotePortTaken } from './tunnel'

export interface InstallSteps {
  grant(route: string): Promise<InstallGrant>
  cancel(grant: InstallGrant): void
  line(text: string): void
}

const portTries = 3

export const installSand = async (session: Session, platform: InstallPlatform, ends: { local: number; rport: number }, steps: InstallSteps) => {
  let { rport } = ends
  for (let tries = 1; ; tries++) {
    const grant = await steps.grant(`http://127.0.0.1:${rport}`)
    const forwards = ['-R', `${rport}:127.0.0.1:${ends.local}`]
    const result = await spawnRemote(session, installCommand(platform, grant.command), { forwards, line: steps.line }).exited
    if (result.code === 0) return rport
    steps.cancel(grant)
    if (!remotePortTaken(result) || tries === portTries || session.signal?.aborted) throw sshFailure(result, session.answers, session.signal)
    rport = randomRemotePort()
  }
}
