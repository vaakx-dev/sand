import type { HostRoute } from '@sand/host-gateway/contract'
import type { BuildInfo, DeviceInfo, Hello, WireEvent } from '@sand/protocol'
import type { ConnectionInfo, ConnectionStatus, WireState } from '../contract'
import { errorMessage } from '@sand/kit'
import { Unpaired } from '../auth/unpaired'
import type { Call } from '../wire/connection'
import { learn } from './book'
import { candidates } from './candidates'
import { openRoute, type Opened, type Slot, type SlotHandlers } from './open'
import { createRetry } from './retry'
import { selectRoute, type Route } from './select'
import { onSlowerRoute } from './slower'
import { TimedOut, within } from './timeout'
import { createTimers } from './timers'
import { onWake } from './wake'

export interface PcOptions {
  seeds(): string[]
  expected(): string | undefined
  trusted?(): string | undefined
  ticket(base: string, host: string): Promise<string>
  offline: string
  event(event: WireEvent): void
  hello(hello: Hello): void
  changed(): void
  identified?(id: string): void
}

export interface PcConnection {
  state(): WireState
  info(): ConnectionInfo
  retryAt(): number | undefined
  call: Call
  base(): string | undefined
  host(): string | undefined
  nudge(): void
  close(): void
}

const heartbeatWait = 8000
const wakeWait = 4000
const wakeGap = 3000

const visible = () => typeof document === 'undefined' || document.visibilityState === 'visible'
const offlineNow = () => typeof navigator !== 'undefined' && navigator.onLine === false

export const createPcConnection = (options: PcOptions): PcConnection => {
  let current: Slot | undefined
  let route: Route | undefined
  let hostId: string | undefined
  let build: BuildInfo | undefined
  let since: number | undefined
  let error: string | undefined
  let failedAt: number | undefined
  let lastCheck = 0
  let everOpened = false
  let unpaired = false
  let busy = false
  let closed = false
  const retry = createRetry(() => void work(attempt))

  const status = (): ConnectionStatus => {
    if (unpaired) return 'unpaired'
    if (current) return 'connected'
    if (offlineNow() || retry.failures() >= 3) return 'offline'
    return everOpened || retry.failures() > 0 ? 'reconnecting' : 'connecting'
  }

  const state = (): WireState => {
    if (unpaired) return 'unpaired'
    if (current) return 'open'
    return everOpened ? 'closed' : 'connecting'
  }

  const schedule = () => {
    if (closed || current || unpaired) return retry.clear()
    retry.schedule()
  }

  const slower = () =>
    current !== undefined && route !== undefined && hostId !== undefined && onSlowerRoute(route, candidates(options.seeds(), hostId), hostId)

  const timers = createTimers(
    () => {
      if (current && visible()) void heartbeat(current, heartbeatWait)
    },
    () => void work(reprobe),
  )

  const plan = () => timers.update(current !== undefined, slower())

  const drop = (slot: Slot) => {
    if (slot !== current) return
    current = undefined
    plan()
    if (!busy) schedule()
    options.changed()
  }

  const lose = (slot: Slot) => {
    drop(slot)
    slot.connection.close()
  }

  const noteBuild = (slot: Slot, info: DeviceInfo | undefined) => {
    if (slot !== current || !info?.build || info.build.id === build?.id) return
    build = info.build
    options.changed()
  }

  const askDevice = (slot: Slot, wait: number) =>
    within(slot.connection.call<DeviceInfo>({ type: 'device.info' }), wait, 'The PC stopped answering').then(info => {
      noteBuild(slot, info)
      return info
    })

  const resync = (slot: Slot) => {
    void slot.connection.call<Hello>({ type: 'hello' }).then(
      hello => slot === current && options.hello(hello),
      () => {},
    )
    void askDevice(slot, heartbeatWait).catch(() => {})
  }

  const handlers: SlotHandlers = {
    event(slot, event) {
      if (slot !== current) return
      options.event(event)
      if (event.name === 'routes.change' && hostId) {
        learn(hostId, event.args[0])
        plan()
      }
      if (event.name === 'runtime.changed') resync(slot)
    },
    close: drop,
  }

  const learnRoutes = (slot: Slot, id: string) =>
    void slot.connection.call<HostRoute[]>({ type: 'host.routes' }).then(
      list => {
        if (!Array.isArray(list)) return
        learn(id, list)
        if (slot === current) plan()
      },
      () => {},
    )

  const adopt = ({ slot, hello, route: next, id }: Opened) => {
    const old = current
    current = slot
    old?.connection.close()
    retry.clear()
    retry.reset()
    route = next
    hostId = id
    build = undefined
    if (!old) since = Date.now()
    unpaired = false
    everOpened = true
    options.hello(hello)
    plan()
    options.changed()
    learnRoutes(slot, id)
  }

  const attempt = async () => {
    const expected = options.expected()
    const next = await selectRoute(candidates(options.seeds(), expected), expected, options.trusted?.())
    const id = next.identity.deviceId
    hostId = id
    options.identified?.(id)
    return openRoute(next, id, options.ticket, handlers)
  }

  const reprobe = async () => {
    const id = hostId
    if (!id) return
    const next = await selectRoute(candidates(options.seeds(), id), id)
    if (current && route && next.url === route.url) {
      route = { ...route, latency: next.latency }
      plan()
      options.changed()
      return
    }
    return openRoute(next, id, options.ticket, handlers)
  }

  const work = async (job: () => Promise<Opened | undefined>) => {
    if (closed || busy) return
    busy = true
    if (!current) {
      retry.clear()
      options.changed()
    }
    try {
      const opened = await job()
      if (closed) opened?.slot.connection.close()
      else if (opened) adopt(opened)
    } catch (failure) {
      if (!closed && !current) {
        unpaired = failure instanceof Unpaired
        error = errorMessage(failure)
        failedAt = Date.now()
      }
    } finally {
      busy = false
    }
    if (closed || current || retry.pending()) return
    schedule()
    options.changed()
  }

  const heartbeat = async (slot: Slot, wait: number) => {
    try {
      await askDevice(slot, wait)
      return slot === current
    } catch (failure) {
      if (failure instanceof TimedOut) lose(slot)
      return false
    }
  }

  const check = async () => {
    const slot = current
    if (!slot || Date.now() - lastCheck < wakeGap) return
    lastCheck = Date.now()
    if ((await heartbeat(slot, wakeWait)) && slower()) void work(reprobe)
  }

  const nudge = () => {
    if (closed || busy) return
    if (current) return void check()
    void work(attempt)
  }

  const stopWake = onWake(
    online => {
      if (online) retry.reset()
      if (!unpaired) nudge()
    },
    () => options.changed(),
  )

  queueMicrotask(() => void work(attempt))

  return {
    state,
    info: () => ({
      status: status(),
      url: route?.url,
      kind: route?.kind,
      since,
      retryAt: retry.at(),
      latency: route ? Math.round(route.latency) : undefined,
      error,
      failedAt,
      build: build ?? route?.identity.build,
    }),
    retryAt: retry.at,
    call: request => (current ? current.connection.call(request) : Promise.reject(new Error(options.offline))),
    base: () => (current ? route?.url : undefined),
    host: () => hostId,
    nudge,
    close() {
      if (closed) return
      closed = true
      stopWake()
      retry.clear()
      const slot = current
      current = undefined
      plan()
      slot?.connection.close()
    },
  }
}
