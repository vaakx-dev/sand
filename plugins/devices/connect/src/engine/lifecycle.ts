import {
  type ConnectionStatus,
  type ConnectOptions,
  type Freshness,
  type PcIdentity,
  PcUnavailable,
  type PublishedRoute,
  type Route,
  routesChange,
} from '@sand/devices-contract'
import type { DialContext, DialRun } from '../dial/context'
import { dial } from '../dial/dial'
import type { Opened } from '../dial/open'
import { probeRoute } from '../dial/probe'
import type { LinkListener } from '../link/link'
import type { RouteBook } from '../routes/book'
import { isPublishedRoutes } from '../routes/valid'
import { timer } from '../time/timer'
import { drainMax, steadyAfter } from '../timing'
import { transportOf } from '../transport/pick'
import { type Active, connectedStatus } from './active'
import type { attemptLog } from './attempts'
import { backoffDelay } from './backoff'
import { healthWatch } from './health'
import { publishedOf } from './hello'
import { upgrader } from './upgrade'

export const lifecycle = (options: ConnectOptions, book: RouteBook, attempts: ReturnType<typeof attemptLog>) => {
  const { target, wake } = options
  const retryTimer = timer()
  const steadyTimer = timer()
  let status: ConnectionStatus = { phase: 'connecting', attempt: 1 }
  let active: Active | undefined
  let heard: number | undefined
  let identity: PcIdentity | undefined
  let lastTag: string | undefined
  let failures = 0
  let dialing: DialRun | undefined
  let closed = false

  const name = () => identity?.name ?? target.name ?? target.id
  const unavailable = () => new PcUnavailable(target.id, name(), status)

  const setStatus = (next: ConnectionStatus) => {
    status = next
    options.changed()
  }

  const usableRoutes = () =>
    book
      .entries(options.secure)
      .filter(entry => entry.usable)
      .map(entry => entry.route)

  const candidates = () => (wake.online() ? usableRoutes() : usableRoutes().filter(route => route.kind === 'local'))

  const expected = () => {
    const publicKey = target.publicKey ?? identity?.publicKey
    return publicKey ? { id: target.id, publicKey } : { id: target.id }
  }

  const listener: LinkListener = {
    event(link, eventName, payload) {
      if (link !== active?.opened.link) return
      if (eventName === routesChange.id && isPublishedRoutes(payload)) publish(payload)
      options.event(eventName, payload)
    },
    closed(link, reason) {
      if (link === active?.opened.link) lose(reason)
    },
    closedError: unavailable,
  }

  const context: DialContext = {
    signer: options.signer,
    expected,
    transportOf: route => transportOf(options.transports, route),
    greeting: options.greeting,
    identified: next => learn(next),
    listener,
  }

  const dialRoutes = (routes: Route[], run: DialRun) => dial(routes, context, run, attempts.add)

  const health = healthWatch({
    current: () => active?.opened.link,
    visible: options.visible,
    answers: route => probeRoute(route, context.transportOf, expected()).then(probe => probe.ok),
    measured(link, latency) {
      if (active?.opened.link !== link) return
      active.latency = latency
      setStatus(connectedStatus(active))
    },
    failed(link) {
      if (active?.opened.link === link) replace()
    },
    changed: options.changed,
  })

  const upgrade = upgrader({
    current: () => active,
    candidates,
    usable: route => usableRoutes().some(known => known.key === route.key),
    dial: dialRoutes,
    adopt: opened => adopt(opened),
    lose: cause => lose(cause),
  })

  const publish = (published: PublishedRoute[] | undefined) => {
    if (!published || !book.publish(published)) return
    options.changed()
    upgrade.plan()
  }

  const learn = (next: PcIdentity) => {
    if (identity && JSON.stringify(identity) === JSON.stringify(next)) return
    identity = next
    options.identified?.(next)
  }

  const noteBlockedRoutes = () => {
    const at = Date.now()
    for (const entry of book.entries(options.secure))
      if (entry.blocked === 'blocked-https') attempts.add({ route: entry.route, result: 'blocked-https', at })
  }

  const scheduleRetry = (cause: string) => {
    const delay = backoffDelay(failures++)
    setStatus({ phase: 'reconnecting', attempt: failures, retryAt: Date.now() + delay, cause })
    retryTimer.set(delay, () => void dialNow())
  }

  const stuck = () => setStatus(wake.online() ? { phase: 'blocked', reason: 'no-route' } : { phase: 'offline' })

  const dialNow = async () => {
    if (closed || active || dialing) return
    retryTimer.clear()
    noteBlockedRoutes()
    const routes = candidates()
    if (!routes.length) return stuck()
    const attempt = failures + 1
    const run: DialRun = { stopped: false, greeting: route => setStatus({ phase: 'greeting', route, attempt }) }
    dialing = run
    setStatus({ phase: 'connecting', attempt })
    const outcome = await dialRoutes(routes, run)
    if (dialing !== run) {
      if (outcome.ok) outcome.opened.link.close()
      return
    }
    dialing = undefined
    if (outcome.ok) return adopt(outcome.opened)
    if (outcome.blocked) return setStatus({ phase: 'blocked', ...outcome.blocked })
    scheduleRetry(outcome.cause)
  }

  const adopt = (opened: Opened) => {
    const previous = active
    const retagged = lastTag !== undefined && lastTag !== opened.hello.tag
    lastTag = opened.hello.tag
    active = { opened, since: previous?.since ?? Date.now(), latency: opened.ms }
    previous?.opened.link.retire(drainMax)
    if (!previous)
      steadyTimer.set(steadyAfter, () => {
        failures = 0
      })
    learn(opened.identity)
    publish(publishedOf(opened.hello))
    setStatus(connectedStatus(active))
    health.watch()
    upgrade.plan()
    options.greeted(opened.hello, retagged)
  }

  const drop = () => {
    const link = active?.opened.link
    heard = link?.heard() ?? heard
    active = undefined
    upgrade.stop()
    health.stop()
    steadyTimer.clear()
    link?.close()
  }

  const lose = (cause: string) => {
    drop()
    scheduleRetry(cause)
  }

  const replace = () => {
    drop()
    void dialNow()
  }

  const freshness = (): Freshness => {
    if (!active) return heard === undefined ? { state: 'stale' } : { state: 'stale', heard }
    const { link } = active.opened
    return health.checking(link) ? { state: 'checking', heard: link.heard() } : { state: 'live' }
  }

  const woke = () => {
    if (closed) return
    if (!active) return void dialNow()
    health.wake()
    void upgrade.run()
  }

  const stopWake = wake.onWake(woke)

  return {
    status: () => status,
    freshness,
    active: () => active,
    identity: () => identity,
    tag: () => lastTag,
    name,
    unavailable,
    start: () => queueMicrotask(woke),
    woke,
    close() {
      if (closed) return
      closed = true
      stopWake()
      retryTimer.clear()
      steadyTimer.clear()
      upgrade.stop()
      health.stop()
      if (dialing) dialing.stopped = true
      dialing = undefined
      active?.opened.link.close()
      active = undefined
    },
  }
}
