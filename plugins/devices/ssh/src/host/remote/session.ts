import type { InstallPlatform } from '@sand/devices-contract'
import type { ServerInfo } from '@sand/host-gateway/contract'
import { isRecord } from '@sand/util'
import type { Answers } from '../askpass/answers'
import { sshFailure, succeeded } from '../ssh/failure'
import type { Ssh, SshCall } from '../ssh/run'
import { ensureCommand, markers, type RemoteCommand, unameCommand } from './scripts'

export interface Session {
  ssh: Ssh
  destination: string[]
  answers: Answers
  signal?: AbortSignal
}

type Extra = Pick<SshCall, 'forwards' | 'line'>

const connectionFailed = 255

export const spawnRemote = ({ ssh, destination, answers, signal }: Session, { command, stdin }: Partial<RemoteCommand>, extra: Extra = {}) =>
  ssh({ destination, command, stdin, answers, signal, ...extra })

export const runRemote = (session: Session, command: RemoteCommand, extra?: Extra) =>
  succeeded(spawnRemote(session, command, extra).exited, session.answers, session.signal)

const platforms: Record<string, InstallPlatform> = { linux: 'linux', darwin: 'darwin' }

export const platformOf = (uname: string): InstallPlatform => {
  const name = uname.trim().split(/\r?\n/).at(-1)?.split(/\s+/)[0] ?? ''
  const found = platforms[name.toLowerCase()]
  if (found) return found
  if (/^(MINGW|MSYS|CYGWIN)/i.test(name)) return 'win32'
  throw new Error(`sand doesn't run on ${name}; it runs on Windows, macOS and Linux`)
}

export const detectPlatform = async (session: Session) => {
  const result = await spawnRemote(session, unameCommand).exited
  if (result.code === connectionFailed || session.signal?.aborted) throw sshFailure(result, session.answers, session.signal)
  return result.code === 0 ? platformOf(result.stdout) : 'win32'
}

const isServerInfo = (value: unknown): value is ServerInfo => isRecord(value) && typeof value.url === 'string' && typeof value.pid === 'number'

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

export const serverOf = (output: string): ServerInfo | undefined => {
  const lines = output.split(/\r?\n/).map(line => line.trim())
  if (lines.includes(markers.missing)) return undefined
  const line = lines.find(found => found.startsWith(markers.server))
  const parsed = line ? parseJson(line.slice(markers.server.length)) : undefined
  if (!isServerInfo(parsed)) throw new Error("sand on that machine didn't say where it runs")
  return parsed
}

export const ensureRunning = async (session: Session, platform: InstallPlatform) => serverOf((await runRemote(session, ensureCommand(platform))).stdout)

export const remotePort = (server: ServerInfo) => Number(new URL(server.url).port)
