import type { ProjectRef } from '@sand/protocol'
import type { SyncApplied, SyncExport, SyncImported, SyncMode, SyncState } from '../contract'
import { move, type Report, type SyncWire } from './move'

const known = (source: SyncState, target: SyncState) => Boolean(source.head && target.lineage.includes(source.head))

const transfer = async (wire: SyncWire, from: ProjectRef, to: ProjectRef, have: string[], report?: Report) => {
  const exported = await wire.call<SyncExport>({ type: 'sync.export', path: from.path, kind: 'snapshot', have }, from.device)
  await move(wire, from, to, exported, 'files', report)
  return wire.call<SyncImported>({ type: 'sync.import', ...exported, kind: 'snapshot', path: to.path }, to.device)
}

export const sendSnapshot = async (wire: SyncWire, from: ProjectRef, to: ProjectRef, mode: SyncMode, report?: Report): Promise<SyncApplied> => {
  const source = await wire.call<SyncState>({ type: 'sync.state', path: from.path }, from.device)
  if (!source.exists || !source.head) throw new Error(`${from.path} is not a folder`)
  const target = await wire.call<SyncState>({ type: 'sync.state', path: to.path }, to.device)
  if (known(source, target)) return { result: 'current', head: target.head ?? source.head, conflicts: target.conflicts, changed: 0 }
  const imported = await transfer(wire, from, to, target.lineage, report)
  const complete = imported.missing ? await transfer(wire, from, to, [], report) : imported
  if (complete.missing) throw new Error(`Some files did not arrive in ${to.path}. Try sending again.`)
  report?.({ phase: 'apply', sent: 0, total: 1, text: 'Updating files' })
  return wire.call<SyncApplied>({ type: 'sync.apply', path: to.path, commit: source.head, mode }, to.device)
}

export const sendProject = async (wire: SyncWire, from: ProjectRef, to: ProjectRef, report?: Report): Promise<SyncApplied> => {
  const applied = await sendSnapshot(wire, from, to, 'merge', report)
  if (applied.result === 'merged') await sendSnapshot(wire, to, from, 'merge', report)
  return applied
}
