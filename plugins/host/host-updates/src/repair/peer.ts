import type { HostHealth } from '@sand/host-health/contract'
import type { RemoteRecord } from '@sand/host-remotes/contract'
import { errorMessage } from '@sand/kit'
import { callPeer, healthText, parseHealth, remoteStore, waitHealthy, type HealthOutcome } from '@sand/kit/host'
import type { DeviceInfo, WireRequest } from '@sand/protocol'
import type { PcRepairResult } from '../contract'

export type PeerCall = (record: RemoteRecord, request: WireRequest, sockets: Set<WebSocket>, timeout?: number) => Promise<unknown>

export interface RepairDeps {
  home: string
  self: DeviceInfo
  call?: PeerCall
}

interface PeerState {
  phase: string
  error?: string
  current?: string
}

type Ask = (request: WireRequest, timeout: number) => Promise<unknown>

const pollInterval = 3000
const pollTimeout = 20 * 60_000
const healthTimeout = 120_000

const short = (id: string | undefined) => (id ?? 'unknown').slice(0, 6)

const isObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object'

const parseState = (value: unknown): PeerState | undefined => {
  if (!isObject(value) || typeof value.phase !== 'string') return
  return { phase: value.phase, error: typeof value.error === 'string' ? value.error : undefined, current: buildId(value.current) }
}

const buildId = (value: unknown) => (isObject(value) && typeof value.id === 'string' ? value.id : undefined)

const targetOf = (value: unknown) => (isObject(value) ? buildId(value.target) : undefined)

const finished = (state: PeerState | undefined) => state?.phase === 'idle' || state?.phase === 'failed'

const waitFinished = async (ask: Ask, first: PeerState | undefined) => {
  const deadline = Date.now() + pollTimeout
  let state = first
  while (!finished(state) && Date.now() < deadline) {
    await Bun.sleep(pollInterval)
    try {
      state = parseState(await ask({ type: 'updates.state' }, 10_000)) ?? state
    } catch {}
  }
  return state
}

const readHealth = async (ask: Ask, name: string): Promise<HostHealth> => {
  const health = parseHealth(await ask({ type: 'host.health' }, 10_000))
  if (!health) throw new Error(`${name} sent a health report this sand can't read`)
  return health
}

const healthLines = (outcome: HealthOutcome) => {
  const lines = healthText(outcome).split('\n')
  const log = lines.indexOf('Last lines of server.log:')
  return lines.slice(0, Math.min(3, log < 0 ? lines.length : log)).join('\n')
}

const runningBuild = (state: PeerState | undefined, outcome?: HealthOutcome) => outcome?.report?.build?.id ?? state?.current

const repairError = (name: string, expected: string, state: PeerState | undefined, outcome?: HealthOutcome) => {
  if (!finished(state)) return `${name} did not finish the repair in time`
  if (state?.phase === 'failed') return state.error ?? `${name} could not finish the repair`
  if (outcome && !outcome.ok) return healthLines(outcome) || `${name} is not healthy after the repair`
  const build = runningBuild(state, outcome)
  if (build !== expected) return `${name} went back to build ${short(build)}`
}

export const repairPeer = async (deps: RepairDeps, device: string): Promise<PcRepairResult> => {
  if (device === deps.self.id) throw new Error('This PC cannot repair itself; use Repair on another PC')
  const record = (await remoteStore(deps.home)).get(device)
  if (!record) throw new Error('Unknown PC')
  const call = deps.call ?? callPeer
  const sockets = new Set<WebSocket>()
  const ask: Ask = (request, timeout) => call(record, request, sockets, timeout)
  try {
    let started: unknown
    try {
      started = await ask({ type: 'updates.repair' }, 60_000)
    } catch (error) {
      return { device, build: '', ok: false, error: errorMessage(error) }
    }
    const expected = targetOf(started)
    if (!expected) return { device, build: '', ok: false, error: `${record.name} did not say which sand build it reinstalls` }
    const state = await waitFinished(ask, parseState(started))
    const outcome = state?.phase === 'idle' ? await waitHealthy(() => readHealth(ask, record.name), { timeout: healthTimeout }) : undefined
    const build = runningBuild(state, outcome) ?? expected
    const error = repairError(record.name, expected, state, outcome)
    return error ? { device, build, ok: false, error } : { device, build, ok: true }
  } finally {
    for (const socket of sockets) socket.close()
    sockets.clear()
  }
}
