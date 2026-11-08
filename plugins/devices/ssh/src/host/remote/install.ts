import type { InstallGrant, InstallPlatform } from '@sand/devices-contract'
import { sshFailure } from '../ssh/failure'
import type { SshResult } from '../ssh/run'
import { randomRemotePort } from './ports'
import { installCommand, markers } from './scripts'
import { type Session, spawnRemote } from './session'
import { remotePortTaken } from './tunnel'

export interface InstallSteps {
  grant(route: string): Promise<InstallGrant>
  cancel(grant: InstallGrant): void
  line(text: string): void
}

const portTries = 3

const doneCode = (line: string) => (line.startsWith(markers.done) ? Number(line.slice(markers.done.length)) : undefined)

const runInstaller = async (session: Session, platform: InstallPlatform, command: string, forwards: string[], line: (text: string) => void): Promise<SshResult> => {
  let done: number | undefined
  const child = spawnRemote(session, installCommand(platform, command), {
    forwards,
    line: text => {
      done ??= doneCode(text)
      if (done === undefined) return line(text)
      child.kill()
    },
  })
  const result = await child.exited
  return done === undefined ? result : { ...result, code: done }
}

export const installSand = async (session: Session, platform: InstallPlatform, ends: { local: number; rport: number }, steps: InstallSteps) => {
  let { rport } = ends
  for (let tries = 1; ; tries++) {
    const grant = await steps.grant(`http://127.0.0.1:${rport}`)
    const forwards = ['-R', `${rport}:127.0.0.1:${ends.local}`]
    const result = await runInstaller(session, platform, grant.command, forwards, steps.line)
    if (result.code === 0) return rport
    steps.cancel(grant)
    if (!remotePortTaken(result) || tries === portTries || session.signal?.aborted) throw sshFailure(result, session.answers, session.signal)
    rport = randomRemotePort()
  }
}
