import type { ProjectRef, SyncApplied, SyncExport, SyncMode, SyncState } from '@sand/protocol'
import type { SyncCall } from './call'
import { move, type Report } from './move'

const known = (source: SyncState, target: SyncState) => Boolean(source.head && target.lineage.includes(source.head))

export const sendSnapshot = async (call: SyncCall, from: ProjectRef, to: ProjectRef, mode: SyncMode, report?: Report): Promise<SyncApplied> => {
  const source = await call<SyncState>({ type: 'sync.state', path: from.path }, from.device)
  if (!source.exists || !source.head) throw new Error(`${from.path} is not a folder`)
  const target = await call<SyncState>({ type: 'sync.state', path: to.path }, to.device)
  if (known(source, target)) return { result: 'current', head: target.head ?? source.head, conflicts: target.conflicts, changed: 0 }
  const exported = await call<SyncExport>({ type: 'sync.export', path: from.path, kind: 'snapshot', have: target.lineage }, from.device)
  await move(call, from, to, exported, 'files', report)
  await call({ type: 'sync.import', transfer: exported.transfer, kind: 'snapshot', path: to.path, chunks: exported.chunks, commit: exported.commit }, to.device)
  report?.({ phase: 'apply', sent: 0, total: 1, text: 'Updating files' })
  return call<SyncApplied>({ type: 'sync.apply', path: to.path, commit: source.head, mode }, to.device)
}
