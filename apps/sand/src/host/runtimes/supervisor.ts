import type { FailedPlugin, HostOptions, RuntimeMessage, RuntimeReason, Runtimes, WireEvent } from '@sand/protocol'
import { errorMessage } from '@sand/kit'
import { createBackoff } from './backoff'
import { stopAll, terminate } from './kill'
import { createLauncher, type Launched } from './launch'
import { changed, failed, notice } from './notices'
import { sendTo, type Child } from './spawn'
import { createWaiters } from './waiters'

export interface SupervisorEvents {
  runtimes(): void
  event(event: WireEvent): void
}

export const createSupervisor = (options: HostOptions, main: () => string, events: SupervisorEvents) => {
  let current: Child | undefined
  let lastError: string | undefined
  let lastFailed: FailedPlugin[] = []
  let announce = false
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

  const release = (sessions: string[]) => {
    if (!current) {
      for (const id of sessions) handover.add(id)
      return
    }
    if (sessions.length) sendTo(current, { type: 'release', sessions })
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
    events.event(notice('An older sand runtime stopped before its turns finished'))
    if (current) events.event(changed(current.id, 'crash'))
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
    const text = `sand runtime stopped (code ${code}); restarting`
    console.error(text)
    events.event(notice(text))
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
    release([...handover])
    handover.clear()
    events.runtimes()
    waiters.resolve(child)
    if (announce) events.event(changed(child.id, reason))
    announce = true
    if (!child.failed.length) return
    const text = `Some plugins did not load: ${child.failed.map(plugin => `${plugin.id}: ${plugin.error}`).join('; ')}`
    console.error(text)
    events.event(notice(text))
  }

  const fail = (error: string, plugins: FailedPlugin[] = []) => {
    console.error(`could not start a sand runtime: ${error}`)
    lastFailed = plugins
    if (current) {
      events.event(notice(`Could not start a fresh runtime: ${error}. The old one keeps running.`))
      events.event(failed(error))
      return false
    }
    lastError = error
    const delay = backoff.schedule()
    const retry = delay ? `in ${delay / 1000} s` : 'soon'
    events.event(notice(`Could not start the sand runtime: ${error}. Trying again ${retry}.`))
    events.event(failed(error))
    return false
  }

  const run = async (reason: RuntimeReason) => {
    backoff.cancel()
    const launched = await launcher.launch().catch((error: unknown): Launched => ({ error: errorMessage(error) }))
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

  const stop = async () => {
    stopping = true
    backoff.clear()
    for (const timer of drainTimers.values()) clearTimeout(timer)
    drainTimers.clear()
    waiters.resolve(undefined)
    await stopAll(launcher.procs())
  }

  return { runtimes, start, stop }
}
