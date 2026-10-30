import type { BlockReason, ConnectionStatus, PcTone, PcView, Route, RouteKind } from '@sand/devices-contract'
import { platformWords } from '../requests/words'
import { agoWords, secondsUntil } from '../shared/time'

export type NameOf = (pc: string) => string

const kindWords: Record<Exclude<RouteKind, 'via'>, string> = { local: 'This computer', lan: 'Home wifi', tailscale: 'Tailscale' }

export const routeWords = (route: Route, nameOf: NameOf) => (route.kind === 'via' ? `Via ${nameOf(route.via ?? '')}` : kindWords[route.kind])

export const routeAddress = (route: Route) => {
  if (!route.url) return undefined
  try {
    return new URL(route.url).host
  } catch {
    return route.url
  }
}

export const msWords = (ms: number | undefined) => (ms === undefined ? undefined : `${Math.round(ms)} ms`)

export const toneOf = (status: ConnectionStatus): PcTone => {
  if (status.phase === 'connected') return 'ok'
  if (status.phase === 'blocked') return 'bad'
  return status.phase === 'offline' ? 'off' : 'wait'
}

export const blockedWords = (reason: BlockReason, device: string): string =>
  ({
    removed: `${device} was removed`,
    'not-paired': `Doesn’t know ${device.toLowerCase()}`,
    'wrong-pc': 'A different PC answered',
    'no-route': 'Can’t connect from here',
  })[reason]

const joined = (...parts: (string | undefined)[]) => parts.filter(Boolean).join(' · ')

export const statusWords = (view: PcView, nameOf: NameOf, device: string, now = Date.now()) => {
  const { status } = view
  if (status.phase === 'connected')
    return status.route.kind === 'local' ? joined('This computer', platformWords(view.platform)) : joined(routeWords(status.route, nameOf), msWords(status.latency))
  if (status.phase === 'connecting') return 'Connecting…'
  if (status.phase === 'reconnecting') {
    const wait = secondsUntil(status.retryAt, now)
    return wait ? `Reconnecting · trying again in ${wait} s` : 'Reconnecting…'
  }
  if (status.phase === 'offline') return view.seen ? `Offline · last seen ${agoWords(view.seen, now)}` : 'Offline'
  return blockedWords(status.reason, device)
}

export const pickerWords = (view: PcView, nameOf: NameOf, device: string, now = Date.now()) => {
  const { status } = view
  if (status.phase === 'connected') return routeWords(status.route, nameOf)
  if (status.phase === 'offline') return view.seen ? `Offline · seen ${agoWords(view.seen, now)}` : 'Offline'
  if (status.phase === 'blocked') return 'Can’t connect'
  return statusWords(view, nameOf, device, now)
}
