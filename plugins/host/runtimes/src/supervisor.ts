import type { HostOptions } from '@sand/host-daemon/contract'
import { errorMessage } from '@sand/util'
import { createBackoff } from './backoff'
import type { FailedPlugin, RuntimeChange, RuntimeMessage, RuntimeReason, Runtimes } from './contract'
import { stopAll, terminate } from './kill'
import { createLauncher, type Launched } from './launch'
import { listFailed, restoredText } from './notices'
import { createSafeMode } from './safe'
import { sendTo, type Child } from './spawn'
import { createWaiters } from './waiters'

interface SupervisorEvents {
  runtimes(): void
  changed(change: RuntimeChange): void
  failed(error: string): void
  good(): void
  restore(): Promise<string[]>
}

export const createSupervisor = (options: HostOptions, main: () => string, events: SupervisorEvents, startSafe: boolean) => {
  const safeMode = createSafeMode(startSafe)
  let current: Child | undefined
  let lastError: string | undefined
  let lastFailed: FailedPlugin[] = []
  let announce = false
  let restoreTried = false
  let started = false
  let stopping = false
  let swapping: Promise<boolean> | undefined
  let queued: { reason: RuntimeReason; result: PromiseWithResolvers<boolean> } | undefined
  const draining = new Set<Child>()
  const drainTimers = new Map<Child, Timer>()
  const waiters = createWaiters()
  const backoff = createBackoff(() => {
    if (!current) void swap('crash')
  })

  const handover = new Set<string>()

  const held = () => new Set([...draining].flatMap(child => child.activity.sessions))

  const release = (sessions: string[]) => {
    const still = held()
    const free = sessions.filter(id => !still.has(id))
    if (!current) {
      for (const id of free) handover.add(id)
      return
    }
    if (free.length) sendTo(current, { type: 'release', sessions: free })
  }

  const receive = (child: Child, message: RuntimeMessage) => {
    if (message.type === 'ready') {
      child.failed = message.failed
      return launcher.ready(child, message.url)
    }
    if (message.type === 'failed') return launcher.failed(child, message.failed)
    if (message.type === 'swap') return void swap('reload')
    if (message.type === 'drained') {
      child.drained = true
      return
    }
    const before = child.activity.sessions
    child.activity = message.activity
    if (child.state === 'draining') release(before.filter(id => !message.activity.sessions.includes(id)))
  }

  const launcher = createLauncher(main, receive)

  const drain = (old: Child) => {
    old.state = 'draining'
    draining.add(old)
    sendTo(old, { type: 'drain' })
    drainTimers.set(
      old,
      setTimeout(() => terminate(old.proc), options.drainTimeout),
    )
  }

  const drainerExited = (child: Child, code: number) => {
    release(child.activity.sessions)
    events.runtimes()
    if (code === 0 && child.drained) return
    if (current) events.changed({ id: current.id, reason: 'crash' })
  }

  const exited = (child: Child, code: number) => {
    clearTimeout(drainTimers.get(child))
    drainTimers.delete(child)
    if (stopping) return
    if (draining.delete(child)) return drainerExited(child, code)
    if (child !== current) return
    current = undefined
    backoff.unhealthy()
    events.runtimes()
    console.error(`sand runtime stopped (code ${code}); restarting`)
    backoff.schedule()
  }

  const promote = (child: Child, reason: RuntimeReason) => {
    const old = current
    current = child
    started = true
    lastError = undefined
    backoff.cancel()
    backoff.healthy()
    void child.proc.exited.then(code => exited(child, code))
    if (old) drain(old)
    sendTo(child, { type: 'promote', held: [...held()] })
    release([...handover])
    handover.clear()
    events.runtimes()
    waiters.resolve(child)
    if (announce) events.changed({ id: child.id, reason })
    announce = true
    const safeText = safeMode.ready(child.safe)
    if (safeText) console.error(safeText)
    if (!child.safe) restoreTried = false
    if (!child.safe && !child.failed.length) events.good()
    if (child.failed.length) console.error(`Some plugins did not load: ${listFailed(child.failed)}`)
  }

  const fail = (error: string, plugins: FailedPlugin[] = []) => {
    console.error(`could not start a sand runtime: ${error}`)
    lastFailed = plugins
    if (current) {
      events.failed(error)
      return false
    }
    lastError = error
    if (safeMode.failed(error)) {
      events.failed(error)
      void swap('safe')
      return false
    }
    if (!restoreTried && !safeMode.on()) {
      restoreTried = true
      void tryRestore(error)
      return false
    }
    return retryLater(error)
  }

  const tryRestore = async (error: string) => {
    const names = await events.restore().catch((problem: unknown) => {
      console.error(`could not bring back the last working plugins: ${errorMessage(problem)}`)
      return []
    })
    if (stopping || current) return
    if (!names.length) return void retryLater(error)
    console.error(restoredText(names))
    events.failed(error)
    void swap('plugins')
  }

  const retryLater = (error: string) => {
    backoff.schedule()
    events.failed(error)
    return false
  }

  const run = async (reason: RuntimeReason) => {
    backoff.cancel()
    const launched = await launcher.launch(safeMode.on()).catch((error: unknown): Launched => ({ error: errorMessage(error) }))
    if (stopping) return false
    if ('error' in launched) return fail(launched.error, launched.failed)
    promote(launched.child, reason)
    return true
  }

  const swap = (reason: RuntimeReason): Promise<boolean> => {
    if (stopping) return Promise.resolve(false)
    if (swapping) {
      if (reason === 'crash') return swapping
      queued ??= { reason, result: Promise.withResolvers<boolean>() }
      return queued.result.promise
    }
    const next = run(reason).finally(() => {
      swapping = undefined
      const again = queued
      queued = undefined
      if (!again) return
      if (stopping) return again.result.resolve(false)
      swap(again.reason).then(again.result.resolve, () => again.result.resolve(false))
    })
    swapping = next
    return next
  }

  const runtimes: Runtimes = {
    current: () => current,
    live: () => (current ? [current, ...draining] : [...draining]),
    wait: timeout => (current ? Promise.resolve(current) : waiters.wait(timeout)),
    swap,
    status: () => ({
      pid: process.pid,
      runtime: current ? 'ready' : lastError ? 'failed' : started ? 'restarting' : 'starting',
      error: lastError,
      ...(!current && lastFailed.length ? { failed: lastFailed } : {}),
      draining: draining.size,
    }),
  }

  const start = () => void swap('start')

  const safe = async (on: boolean) => {
    safeMode.set(on)
    if (current?.safe === on) return true
    const ok = await swap('safe')
    if (!ok && current) safeMode.set(current.safe)
    return ok
  }

  const stop = async () => {
    stopping = true
    backoff.clear()
    for (const timer of drainTimers.values()) clearTimeout(timer)
    drainTimers.clear()
    waiters.resolve(undefined)
    await stopAll(launcher.procs())
  }

  return { runtimes, start, stop, safe }
}
