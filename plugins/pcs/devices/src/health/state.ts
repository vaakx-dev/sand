import type { HostHealth } from '@sand/host-health/contract'
import type { PcRepairResult } from '@sand/host-updates/contract'
import { errorMessage, onTimeout, sig, untrack, type Sig } from '@sand/dom'
import type { Context } from 'drydock'

export type PcHealthStatus = 'checking' | 'healthy' | 'problem' | 'unknown' | 'repairing'

export interface PcHealthState {
  status: PcHealthStatus
  health?: HostHealth
  error?: string
}

interface Entry {
  sig: Sig<PcHealthState>
  local: boolean
  connected: boolean
  request: number
}

const pollEvery = 3_000
const pollFor = 90_000
const settleDelay = 2_000
const repairWait = 25 * 60_000

const isRepairResult = (value: unknown): value is PcRepairResult =>
  typeof value === 'object' && value !== null && typeof (value as PcRepairResult).ok === 'boolean'

const answered = (health: HostHealth): PcHealthState => ({ status: health.healthy ? 'healthy' : 'problem', health })

const fallback = (health: HostHealth | undefined, error: string): PcHealthState =>
  health ? { ...answered(health), error } : { status: 'unknown', error }

export const pcHealthStore = (ctx: Context<'wire'>) => {
  const entries = new Map<string, Entry>()
  const timers = new Set<() => void>()
  let alive = true

  const later = (run: () => void, ms: number) => {
    const cancel = onTimeout(() => {
      timers.delete(cancel)
      if (alive) run()
    }, ms)
    timers.add(cancel)
    return cancel
  }

  const sleep = (ms: number) => new Promise<void>(resolve => later(resolve, ms))

  ctx.effect(() => () => {
    alive = false
    for (const cancel of timers) cancel()
    timers.clear()
  })

  const ask = (device: string, local: boolean) =>
    ctx.wire.call<HostHealth>(local ? { type: 'pc.health' } : { type: 'pc.health', device })

  const current = (entry: Entry) => untrack(() => entry.sig.get())

  const entryFor = (device: string, local: boolean) => {
    const known = entries.get(device)
    if (known) {
      known.local = local
      return known
    }
    const entry: Entry = { sig: sig<PcHealthState>({ status: 'checking' }), local, connected: true, request: 0 }
    entries.set(device, entry)
    return entry
  }

  const check = (device: string, entry: Entry) => {
    const id = ++entry.request
    const before = current(entry)
    if (before.status !== 'repairing' && before.status !== 'checking') entry.sig.set({ status: 'checking', health: before.health })
    const settle = (next: (previous: PcHealthState) => PcHealthState) => {
      if (!alive || id !== entry.request) return
      const previous = current(entry)
      if (previous.status !== 'repairing') entry.sig.set(next(previous))
    }
    ask(device, entry.local).then(
      health => settle(() => answered(health)),
      error => settle(previous => ({ status: 'unknown', health: previous.health, error: errorMessage(error) })),
    )
  }

  const refresh = (device: string, local: boolean) => check(device, entryFor(device, local))

  const state = (device: string, local: boolean, connected: boolean) => {
    const known = entries.get(device)
    const entry = known ?? entryFor(device, local)
    const reconnected = !entry.local && connected && !entry.connected
    entry.connected = connected
    const busy = current(entry).status === 'repairing'
    if (!known || (reconnected && !busy)) check(device, entry)
    return entry.sig
  }

  let settling: (() => void) | undefined

  const refreshLocal = () => {
    if (settling) {
      settling()
      timers.delete(settling)
    }
    settling = later(() => {
      settling = undefined
      for (const [device, entry] of entries) if (entry.local) check(device, entry)
    }, settleDelay)
  }

  ctx.on('wire.hello', () => {
    for (const [device, entry] of entries) check(device, entry)
  })
  ctx.on('wire.event', event => {
    if (event.name === 'runtime.changed' || event.name === 'runtime.failed') refreshLocal()
  })

  const poll = async (device: string, entry: Entry, first = pollEvery) => {
    const deadline = Date.now() + pollFor
    let last: HostHealth | undefined
    let wait = first
    while (alive && Date.now() < deadline && !last?.healthy) {
      await sleep(wait)
      wait = pollEvery
      if (!alive) return last
      try {
        last = await ask(device, entry.local)
      } catch {}
    }
    return last
  }

  const resumeRepair = async (device: string, error: unknown) => {
    const deadline = Date.now() + repairWait
    while (alive && Date.now() < deadline) {
      if (ctx.wire.state() === 'open') {
        try {
          return await ctx.wire.call<unknown>({ type: 'pc.repair', device, resume: true })
        } catch {
          if (ctx.wire.state() === 'open') break
        }
      }
      await sleep(pollEvery)
    }
    throw error
  }

  const callRepair = async (device: string) => {
    try {
      return await ctx.wire.call<unknown>({ type: 'pc.repair', device })
    } catch (error) {
      return await resumeRepair(device, error)
    }
  }

  const repair = async (device: string, name: string) => {
    const entry = entryFor(device, false)
    const previous = current(entry).health
    entry.request++
    entry.sig.set({ status: 'repairing', health: previous })
    const fail = (message: string, health = previous) => {
      entry.request++
      entry.sig.set(fallback(health, message))
      ctx.notify?.push(message, { level: 'error' })
    }
    let result: unknown
    try {
      result = await callRepair(device)
    } catch (error) {
      if (alive) fail(`Repair failed: ${errorMessage(error)}`)
      return
    }
    if (!alive) return
    if (isRepairResult(result) && !result.ok) {
      const after = await ask(device, entry.local).catch(() => undefined)
      if (alive) fail(`Repair of ${name} failed: ${result.error ?? 'no reason given'}`, after ?? previous)
      return
    }
    const health = await poll(device, entry, 0)
    if (!alive) return
    entry.request++
    if (!health) {
      const message = `${name} did not answer after the repair`
      entry.sig.set({ status: 'unknown', health: previous, error: message })
      ctx.notify?.push(message, { level: 'error' })
      return
    }
    entry.sig.set(answered(health))
    ctx.notify?.push(health.healthy ? `${name} repaired` : `${name} still has problems`, health.healthy ? undefined : { level: 'error' })
  }

  return { state, refresh, repair }
}

export type PcHealthStore = ReturnType<typeof pcHealthStore>
