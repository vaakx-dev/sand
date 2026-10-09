import type { BuildInfo, UpdateOffer, UpdatePhase, UpdateState } from '@sand/protocol'
import { errorMessage } from '@sand/kit'
import { basename } from 'node:path'
import { isInstalled } from '../dist/layout'
import { healthText } from './health/check'
import type { HealthOutcome } from './health/types'
import type { LaterStore } from './later'
import type { FoundUpdate, PreparedBuild, Updater, UpdaterDeps } from './types'

const firstCheck = 20_000
const checkEvery = 10 * 60_000
const cleanupAfter = 60_000
const staleAfter = 60_000
const drainPoll = 2_000
const restartDelay = 300

const short = (id: string | undefined) => (id ?? 'unknown').slice(0, 6)
const busyPhases: UpdatePhase[] = ['downloading', 'installing', 'switching', 'waiting', 'restarting']
const cancelled = new Error('cancelled')

export const createUpdater = (deps: UpdaterDeps, store: LaterStore): Updater => {
  const installed = isInstalled(deps.app.root(), deps.home)
  let current: BuildInfo | undefined
  let offer: UpdateOffer | undefined
  let found: FoundUpdate | undefined
  let phase: UpdatePhase = 'idle'
  let error: string | undefined
  let epoch = 0
  let lastCheck = Date.now()
  let checking: Promise<UpdateState> | undefined
  let sent = ''
  let timers: ReturnType<typeof setTimeout>[] = []

  const snapshot = (): UpdateState => ({
    installed,
    current,
    offer,
    later: !!offer && store.hidden(offer.build.id),
    phase,
    error,
  })

  const commit = () => {
    const state = snapshot()
    const text = JSON.stringify(state)
    if (text !== sent) {
      sent = text
      deps.changed(state)
    }
    return state
  }

  const busy = () => busyPhases.includes(phase)

  const step = (next: UpdatePhase, ticket: number) => {
    if (ticket !== epoch) throw cancelled
    phase = next
    error = undefined
    commit()
  }

  const fail = (message: string) => {
    phase = 'failed'
    error = message
    commit()
  }

  const runCheck = async (): Promise<UpdateState> => {
    const ticket = epoch
    lastCheck = Date.now()
    try {
      const build = await deps.current()
      const next = await deps.find(build)
      if (ticket !== epoch) return snapshot()
      current = build
      if (!busy()) {
        if (phase === 'failed' && offer?.build.id !== next?.build.id) {
          phase = 'idle'
          error = undefined
        }
        found = next
        offer = next && { source: next.source.id, name: next.source.name, build: next.build }
      }
    } catch (failure) {
      console.error(`sand could not check for updates: ${errorMessage(failure)}`)
    }
    return commit()
  }

  const check = () => {
    if (!installed) return Promise.resolve(snapshot())
    checking ??= runCheck().finally(() => {
      checking = undefined
    })
    return checking
  }

  const idle = () =>
    deps.runtimes.live().every(runtime => !runtime.activity.sessions.length && !runtime.activity.jobs.length)

  const drain = async (ticket: number) => {
    const until = Date.now() + deps.drainTimeout
    while (!idle() && Date.now() < until) {
      await Bun.sleep(Math.max(0, Math.min(drainPoll, until - Date.now())))
      if (ticket !== epoch) throw cancelled
    }
  }

  const cleanup = (keep: string[]) =>
    deps.cleanup(keep).catch(failure => console.error(`sand could not remove old builds: ${errorMessage(failure)}`))

  const goBack = async (before: string) => {
    deps.app.use(before)
    await deps.restorePrevious()
  }

  const unhealthy = async (prepared: PreparedBuild, before: string, previous: string, outcome: HealthOutcome) => {
    const text = healthText(outcome)
    console.error(`build ${short(prepared.build.id)} was not healthy:\n${text}`)
    await goBack(before)
    const back = await deps.runtimes.swap('update')
    if (!back) console.error('the previous sand runtime did not start again either')
    const reason = text.split('\n')[0] || 'no details'
    fail(`build ${short(prepared.build.id)} was not healthy, so this PC went back to build ${short(previous)}: ${reason}`)
  }

  const swapRuntime = async (prepared: PreparedBuild, ticket: number) => {
    const before = deps.app.root()
    const previous = current?.id ?? basename(before)
    deps.app.use(prepared.root)
    const ok = await deps.runtimes.swap('update')
    if (ticket !== epoch) throw cancelled
    if (!ok) {
      await goBack(before)
      fail(`the new sand runtime did not start; this PC stays on build ${short(previous)}`)
      return
    }
    const outcome = await deps.health()
    if (ticket !== epoch) throw cancelled
    if (!outcome.ok) return await unhealthy(prepared, before, previous, outcome)
    current = await deps.current().catch(() => prepared.build)
    if (ticket !== epoch) throw cancelled
    phase = 'idle'
    error = undefined
    offer = undefined
    found = undefined
    commit()
    void cleanup([prepared.root, deps.hostRoot])
  }

  const needsRestart = async (prepared: PreparedBuild, force: boolean) =>
    force || prepared.bun !== Bun.version || (await deps.hostChanged(deps.hostRoot, prepared.root))

  const refreshShim = () =>
    deps.refreshShim().catch(failure => console.error(`sand could not update the sand command: ${errorMessage(failure)}`))

  const install = async (update: FoundUpdate, ticket: number, force: boolean) => {
    try {
      const bytes = await update.source.download()
      step('installing', ticket)
      const prepared = await deps.prepare(bytes, { source: update.source, force })
      await deps.checkLoads(prepared.root, prepared.bunPath)
      step('switching', ticket)
      const changed = await needsRestart(prepared, force)
      if (ticket !== epoch) throw cancelled
      await deps.switchTo(basename(prepared.root))
      await refreshShim()
      if (!changed) return await swapRuntime(prepared, ticket)
      step('waiting', ticket)
      await drain(ticket)
      step('restarting', ticket)
      await Bun.sleep(restartDelay)
      if (ticket !== epoch) throw cancelled
      deps.restart()
    } catch (failure) {
      if (failure === cancelled) return
      fail(errorMessage(failure))
    }
  }

  const matches = (source: string, build: string) =>
    found && found.source.id === source && found.build.id === build ? found : undefined

  let claiming = false

  const apply = async (source: string, build: string) => {
    if (!installed) throw new Error('this PC runs sand from a source folder; it does not update itself')
    if (busy() || claiming) return snapshot()
    claiming = true
    try {
      const update = matches(source, build) ?? (await check().then(() => matches(source, build)))
      if (!update) throw new Error('that update is no longer offered')
      if (busy()) return snapshot()
      const ticket = ++epoch
      step('downloading', ticket)
      void install(update, ticket, false)
      return snapshot()
    } finally {
      claiming = false
    }
  }

  const repairFrom = async (sourceId: string): Promise<FoundUpdate> => {
    const source = await deps.source(sourceId)
    if (!source) throw new Error('that PC is not paired with this one')
    const build = await source.latest()
    if (!build) throw new Error(`${source.name} did not say which sand build it runs`)
    return { source, build }
  }

  const repair = async (sourceId: string) => {
    if (!installed) throw new Error('this PC runs sand from a source folder; it cannot be repaired from another PC')
    if (busy() || claiming) throw new Error('sand is already updating')
    claiming = true
    try {
      const update = await repairFrom(sourceId)
      if (busy()) throw new Error('sand is already updating')
      const ticket = ++epoch
      step('downloading', ticket)
      void install(update, ticket, true)
      return { ...snapshot(), target: update.build }
    } finally {
      claiming = false
    }
  }

  return {
    state() {
      if (installed && !checking && Date.now() - lastCheck > staleAfter) void check()
      return snapshot()
    },
    check,
    async later() {
      if (!installed || !offer) return snapshot()
      await store.set(offer.build.id)
      return commit()
    },
    apply,
    repair,
    start() {
      if (!installed || timers.length) return
      void deps
        .current()
        .then(build => {
          current ??= build
          commit()
        })
        .catch(() => {})
      timers = [
        setTimeout(() => {
          void check()
          timers.push(setInterval(() => void check(), checkEvery))
        }, firstCheck),
        setTimeout(() => void cleanup([deps.app.root(), deps.hostRoot]), cleanupAfter),
      ]
    },
    stop() {
      epoch++
      for (const timer of timers) clearTimeout(timer)
      timers = []
    },
  }
}
