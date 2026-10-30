import type { BlockReason, ConnectionStatus, DeviceKind, DeviceRecord, RouteKind } from '@sand/devices-contract'
import { ago } from '@sand/util'

const kindNames: Record<DeviceKind, string> = { pc: 'PC', phone: 'phone', browser: 'browser' }

const platformNames: Record<string, string> = { win32: 'Windows', darwin: 'macOS', linux: 'Linux' }

const routeNames: Record<RouteKind, string> = { local: 'this computer', lan: 'home wifi', tailscale: 'Tailscale', via: 'another of your PCs' }

const blockedText: Record<BlockReason, string> = {
  removed: 'it removed this PC',
  'not-paired': "it doesn't know this PC",
  'wrong-pc': 'another PC answers at its address',
  'no-route': 'no way to reach it',
}

const added = (at: number) => {
  const elapsed = ago(at)
  return elapsed === 'now' ? 'added just now' : `added ${elapsed} ago`
}

export const kindName = (kind: DeviceKind) => kindNames[kind]

export const routeName = (kind: RouteKind) => routeNames[kind]

export const platformName = (platform: string) => platformNames[platform] ?? platform

export const deviceDetails = (record: DeviceRecord) =>
  [record.kind === 'pc' ? undefined : kindName(record.kind), record.platform && platformName(record.platform), added(record.added)].filter(Boolean).join(', ')

const latencyText = (latency?: number) => (latency === undefined ? '' : `, ${Math.round(latency)} ms`)

export const statusText = (status: ConnectionStatus) => {
  if (status.phase === 'connected') return `connected over ${routeName(status.route.kind)}${latencyText(status.latency)}`
  if (status.phase === 'connecting') return 'connecting'
  if (status.phase === 'reconnecting') return `can't connect: ${status.cause}`
  if (status.phase === 'offline') return 'offline'
  return `blocked: ${blockedText[status.reason]}`
}
