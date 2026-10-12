import type { ProjectRef } from '@sand/protocol'
import type { SyncExport, SyncInspect } from '../contract'
import { move, type Report, type SyncWire } from './move'
import { sendSnapshot } from './send'

interface CopyRun {
  setup?: string
  project?: string
}

export const copyProject = async (wire: SyncWire, from: ProjectRef, to: ProjectRef, run: CopyRun, report?: Report) => {
  const inspected = await wire.call<SyncInspect>({ type: 'sync.inspect', path: from.path }, from.device)
  if (inspected.blocked) throw new Error(inspected.blocked)
  if (inspected.git) {
    const exported = await wire.call<SyncExport>({ type: 'sync.export', path: from.path, kind: 'history' }, from.device)
    await move(wire, from, to, exported, 'history', report)
    await wire.call({ type: 'sync.import', ...exported, kind: 'history', path: to.path }, to.device)
  }
  await sendSnapshot(wire, from, to, 'replace', report)
  await wire.call({ type: 'projects.add', path: to.path, ...(run.project ? { project: run.project } : {}) }, to.device)
  if (!run.setup) return
  report?.({ phase: 'setup', sent: 0, total: 1, text: `Running ${run.setup}` })
  await wire.call({ type: 'sync.setup', path: to.path, command: run.setup }, to.device)
}
