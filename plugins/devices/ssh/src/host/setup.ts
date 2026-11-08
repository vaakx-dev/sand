import {
  type InstallGrant,
  installCancel,
  installCreate,
  type InstallPlatform,
  pageLinkKeys,
  pairLink,
  type PcIdentity,
  type Registry,
  type ThisPc,
} from '@sand/devices-contract'
import type { Caller, Hub, Request } from '@sand/host-hub/contract'
import { errorMessage } from '@sand/util'
import type { SshPrompt } from '../contract'
import { type Answers, createAnswers } from './askpass/answers'
import { resolveTarget } from './hosts/list'
import { destinationOf } from './hosts/target'
import type { Machine } from './machines/store'
import { installSand } from './remote/install'
import { freeLocalPort, randomRemotePort } from './remote/ports'
import { joinCommand } from './remote/scripts'
import { detectPlatform, ensureRunning, remotePort, runRemote, type Session } from './remote/session'
import { openTunnel } from './remote/tunnel'
import type { Ssh } from './ssh/run'

export interface Attempt {
  caller: Caller
  signal: AbortSignal
  progress(text: string): void
  ask(prompt: SshPrompt): Promise<string | null>
}

export interface SetupDeps {
  ssh: Ssh
  hub: Hub
  registry: Registry
  thisPc: ThisPc
  localPort(): number
}

const pairingOff = "Pairing is off on this PC, so sand can't add PCs; turn Pairing on in Settings and try again"

const askHub = async <I, O>(hub: Hub, request: Request<I, O>, input: I, caller: Caller) => {
  try {
    return (await hub.answer(request.id, input, caller)) as O
  } catch (error) {
    if (errorMessage(error).startsWith('Nothing answers')) throw new Error(pairingOff)
    throw error
  }
}

const isPaired = (registry: Registry, identity: PcIdentity) => {
  const record = registry.get(identity.id)
  return Boolean(record && !record.removed && record.keys.some(key => key.publicKey === identity.publicKey))
}

export const attemptAnswers = (attempt: Attempt, saved?: Record<string, string>, rejected?: (text: string) => void) =>
  createAnswers({ saved, ask: attempt.ask, notice: attempt.progress, rejected })

interface JoinTarget {
  platform: InstallPlatform
  rport: number
  identity: PcIdentity
}

const join = async ({ hub, registry }: SetupDeps, session: Session, { platform, rport, identity }: JoinTarget, attempt: Attempt) => {
  attempt.progress(`Adding ${identity.name} to your PCs…`)
  const { token } = await askHub(hub, pairLink, { kind: 'pc' }, attempt.caller)
  const link = `http://127.0.0.1:${rport}/#${pageLinkKeys.pair}=${encodeURIComponent(token)}`
  await runRemote(session, joinCommand(platform, link), { line: attempt.progress })
  if (!isPaired(registry, identity)) throw new Error(`${identity.name} didn't join this PC`)
}

export const setUp = async (deps: SetupDeps, host: string, attempt: Attempt): Promise<{ machine: Machine; answers: Answers }> => {
  const { ssh, hub, registry, thisPc } = deps
  const answers = attemptAnswers(attempt)
  const session: Session = { ssh, destination: destinationOf(host), answers, signal: attempt.signal }
  const local = deps.localPort()

  attempt.progress(`Connecting to ${host}…`)
  const target = await resolveTarget(ssh, host)
  const platform = await detectPlatform(session)
  let server = await ensureRunning(session, platform)
  let rport = randomRemotePort()

  if (!server) {
    attempt.progress(`Installing sand on ${host}…`)
    const grant = (route: string) => askHub(hub, installCreate, { platform, route }, attempt.caller)
    const cancel = (made: InstallGrant) => void askHub(hub, installCancel, { id: made.id }, attempt.caller).catch(() => {})
    rport = await installSand(session, platform, { local, rport }, { grant, cancel, line: attempt.progress })
    server = await ensureRunning(session, platform)
    if (!server) throw new Error(`The installer finished, but sand isn't on ${host}`)
  }

  attempt.progress(`Checking sand on ${host}…`)
  const tunnel = await openTunnel(session, { lport: freeLocalPort(), rport, remote: remotePort(server), local })
  try {
    const { identity } = tunnel
    if (identity.id === thisPc.id) throw new Error(`${host} is this PC`)
    if (!isPaired(registry, identity)) await join(deps, session, { platform, rport: tunnel.rport, identity }, attempt)
    const machine = { pc: identity.id, host, name: host, target, platform, lport: tunnel.lport, rport: tunnel.rport }
    return { machine, answers }
  } finally {
    tunnel.close()
  }
}
