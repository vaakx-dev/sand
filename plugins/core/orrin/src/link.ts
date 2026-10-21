import type { Orrin, OrrinEvent, OrrinPlace } from './contract'
import { callDaemon, Unreachable } from './daemon/call'
import { followEvents } from './daemon/events'
import { findDaemon, type Daemon } from './daemon/find'
import { joinPlaces, placeAt } from './places'

interface Listeners {
  changed(): void
  event(event: OrrinEvent): void
  failed(error: unknown): void
}

const retryMs = 5_000
const pingMs = 2_000
const placeEvents = new Set<OrrinEvent['type']>(['project.created', 'view.landed'])

export const createLink = (home: string, listeners: Listeners) => {
  let daemon: Daemon | undefined
  let unfollow: (() => void) | undefined
  let places: OrrinPlace[] = []
  let closed = false

  const drop = () => {
    if (!daemon) return
    unfollow?.()
    unfollow = undefined
    daemon = undefined
    places = []
    listeners.changed()
  }

  const call: Orrin['call'] = async (request, input, signal) => {
    if (!daemon) throw new Error('Orrin is not running on this PC')
    try {
      return await callDaemon(daemon, request, input, signal)
    } catch (error) {
      if (error instanceof Unreachable) drop()
      throw error
    }
  }

  const loadPlaces = async () => {
    const [{ projects }, { views }] = await Promise.all([call('projects.list', {}), call('view.list', {})])
    places = joinPlaces(projects, views)
    listeners.changed()
  }

  const onEvent = (event: OrrinEvent) => {
    listeners.event(event)
    if (placeEvents.has(event.type)) loadPlaces().catch(listeners.failed)
  }

  const connect = async () => {
    if (daemon || closed) return
    const found = await findDaemon(home)
    if (!found) return
    const alive = await callDaemon(found, 'ping', {}, AbortSignal.timeout(pingMs)).then(
      () => true,
      () => false,
    )
    if (!alive || daemon || closed) return
    daemon = found
    unfollow = followEvents(found, { event: onEvent, closed: drop })
    await loadPlaces().catch(listeners.failed)
  }

  const timer = setInterval(() => void connect().catch(listeners.failed), retryMs)
  timer.unref()

  const close = () => {
    closed = true
    clearInterval(timer)
    unfollow?.()
  }

  const service: Orrin = {
    available: () => daemon !== undefined,
    call,
    places: () => places,
    placeAt: path => placeAt(places, path),
  }

  return { service, connect, close }
}
