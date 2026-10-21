import { type DeviceInfo, deviceInfo } from '@sand/host-devices/contract'
import type { BuildInfo } from '@sand/host-dist/contract'
import { type HostRoute, hostRoutes, routesChange } from '@sand/host-gateway/contract'
import { hello, type HelloValues } from '@sand/host-hub/contract'
import { runtimeChanged } from '@sand/host-runtimes/contract'
import { errorMessage } from '@sand/util'
import type { ConnectionInfo, ConnectionStatus, WireState } from '../contract'
import { Unpaired } from '../auth/unpaired'
import { after } from '../detached'
import type { Call, Connection, Heard } from '../integrations/socket'
import { learn } from './book'
import { beatWait, watchHealth } from './health'
import { helloMemory, type HelloKeep } from './hello'
import { openRoute, type ConnectionHandlers, type Opened } from './open'
import { candidates, onSlowerRoute, worthProbing } from './rank'
import { createRetry } from './retry'
import { selectRoute, type Route } from './select'
import { within } from './timeout'
import { onWake } from './wake'

interface PcOptions {
  seeds(): string[]
  expected(): string | undefined
  trusted?(): string | undefined
  ticket(base: string, host: string): Promise<string>
  offline: string
  event(heard: Heard): void
  hello(values: HelloValues): void
  since?(): string | undefined
  changed(): void
  kept?: HelloKeep
}

interface PcConnection {
  state(): WireState
  info(): ConnectionInfo
  call: Call
  base(): string | undefined
  nudge(): void
  close(): void
}

export const createPcConnection = (options: PcOptions): PcConnection => {
  let current: Connection | undefined
  let route: Route | undefined
  let hostId: string | undefined
  let build: BuildInfo | undefined
  let since: number | undefined
  let error: string | undefined
  let failedAt: number | undefined
  let everOpened = false
  let unpaired = false
  let busy = false
  let closed = false
  const retry = createRetry(() => void work(attempt))
  const hellos = helloMemory(options.kept)

  const status = (): ConnectionStatus => {
    if (unpaired) return 'unpaired'
    if (current) return 'connected'
    if (!navigator.onLine || retry.failures() >= 3) return 'offline'
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

  const ticket = async (base: string, host: string) => {
    const url = await options.ticket(base, host)
    if (unpaired) {
      unpaired = false
      options.changed()
    }
    return url
  }

  const alternatives = (id: string, from: Route) => worthProbing(candidates(options.seeds(), id), id, from.url)

  const slower = () => current !== undefined && route !== undefined && hostId !== undefined && onSlowerRoute(route, alternatives(hostId, route), hostId)

  const switchable = () => !current || current.idle()

  const drop = (connection: Connection) => {
    if (connection !== current) return
    current = undefined
    health.plan()
    if (!busy) schedule()
    options.changed()
  }

  const lose = (connection: Connection) => {
    drop(connection)
    connection.close()
  }

  const noteBuild = (connection: Connection, info: DeviceInfo | undefined) => {
    if (connection !== current || !info?.build || info.build.id === build?.id) return
    build = info.build
    options.changed()
  }

  const askDevice = async (connection: Connection, wait: number) => {
    const info = await within(connection.call(deviceInfo, {}), wait, 'The PC stopped answering')
    noteBuild(connection, info)
    return info
  }

  const health = watchHealth({ current: () => current, ask: askDevice, lose, slower, reprobe: () => void work(reprobe) })

  const greeting = () => hellos.greeting(options.since?.() ?? null)

  const resync = (connection: Connection) => {
    void connection.call(hello, greeting()).then(
      greeted => connection === current && options.hello(hellos.take(greeted)),
      () => {},
    )
    void askDevice(connection, beatWait).catch(() => {})
  }

  const handlers: ConnectionHandlers = {
    greeting,
    event(connection, heard) {
      if (connection !== current) return
      options.event(heard)
      if (heard.name === routesChange.id && hostId) learn(hostId, heard.payload as HostRoute[])
      if (heard.name === runtimeChanged.id) resync(connection)
    },
    close: drop,
  }

  const learnRoutes = (connection: Connection, id: string) =>
    void connection.call(hostRoutes, {}).then(
      list => {
        if (Array.isArray(list)) learn(id, list)
      },
      () => {},
    )

  const adopt = ({ connection, hello, route: next, id }: Opened) => {
    const old = current
    current = connection
    old?.close()
    retry.clear()
    retry.reset()
    route = next
    hostId = id
    build = undefined
    if (!old) since = Date.now()
    unpaired = false
    everOpened = true
    options.hello(hellos.take(hello))
    health.plan()
    options.changed()
    learnRoutes(connection, id)
  }

  const attempt = async () => {
    const expected = options.expected()
    const next = await selectRoute(candidates(options.seeds(), expected), expected, options.trusted?.())
    const id = next.identity.deviceId
    hostId = id
    return openRoute(next, id, ticket, handlers)
  }

  const reprobe = async () => {
    const id = hostId
    if (!id || !route || !switchable()) return
    const next = await selectRoute(alternatives(id, route), id)
    if (current && next.url === route.url) {
      route = { ...route, latency: next.latency }
      options.changed()
      return
    }
    const opened = await openRoute(next, id, ticket, handlers)
    if (switchable()) return opened
    opened.connection.close()
  }

  const fail = (failure: unknown) => {
    if (closed || current) return
    unpaired = failure instanceof Unpaired
    error = errorMessage(failure)
    failedAt = Date.now()
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
      if (closed) opened?.connection.close()
      else if (opened) adopt(opened)
    } catch (failure) {
      fail(failure)
    } finally {
      busy = false
    }
    if (closed || current || retry.pending()) return
    schedule()
    options.changed()
  }

  const nudge = () => {
    if (closed || busy) return
    if (current) return void health.check()
    void work(attempt)
  }

  const stopWake = onWake(
    online => {
      if (online) retry.reset()
      if (!unpaired) nudge()
    },
    () => options.changed(),
  )

  const stopStart = after(0, () => void work(attempt))

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
    call: (request, input) => (current ? current.call(request, input) : Promise.reject(new Error(options.offline))),
    base: () => (current ? route?.url : undefined),
    nudge,
    close() {
      if (closed) return
      closed = true
      stopStart()
      stopWake()
      retry.clear()
      const connection = current
      current = undefined
      health.plan()
      connection?.close()
    },
  }
}
