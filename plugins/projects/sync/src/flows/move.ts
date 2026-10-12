import type { DeviceInfo, ProjectRef, WireRequest } from '@sand/protocol'
import { pullTransfer, relayTransfer } from '@sand/kit/transfers'
import type { SyncExport, SyncProgress } from '../contract'

export interface SyncWire {
  call<T = unknown>(request: WireRequest, device?: string): Promise<T>
  fetch(path: string, init?: RequestInit, device?: string): Promise<Response>
}

export type Report = (progress: SyncProgress) => void

type Sent = (sent: number) => void

const sourceSeenFrom = async (wire: SyncWire, from: ProjectRef, to: ProjectRef) => {
  const pc = (ref: ProjectRef) => wire.call<DeviceInfo>({ type: 'device.info' }, ref.device)
  const [source, target] = await Promise.all([pc(from), pc(to)])
  return source.id === target.id ? undefined : source.id
}

const pulled = async (wire: SyncWire, from: ProjectRef, to: ProjectRef, exported: SyncExport, sent: Sent) => {
  try {
    await pullTransfer(<T,>(request: WireRequest) => wire.call<T>(request, to.device), await sourceSeenFrom(wire, from, to), exported, sent)
    return true
  } catch {
    return false
  }
}

const relayed = (wire: SyncWire, from: ProjectRef, to: ProjectRef, exported: SyncExport, sent: Sent) =>
  relayTransfer(
    (path, init) => wire.fetch(path, init, from.device),
    (path, init) => wire.fetch(path, init, to.device),
    exported,
    sent,
  )

export const move = async (wire: SyncWire, from: ProjectRef, to: ProjectRef, exported: SyncExport, phase: 'history' | 'files', report?: Report) => {
  const sent: Sent = count => report?.({ phase, sent: count, total: exported.chunks, text: phase === 'history' ? 'Sending git history' : 'Sending files' })
  if (await pulled(wire, from, to, exported, sent)) return
  await relayed(wire, from, to, exported, sent)
}
