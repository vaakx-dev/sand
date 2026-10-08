import type { ProjectRef, SyncExport, SyncInspect } from '@sand/protocol'
import type { SyncCall } from './call'
import { linkProjects } from './link'
import { move, type Report } from './move'
import { sendSnapshot } from './snapshot'

export interface CopyRun {
  setup?: string
}

export const copyProject = async (call: SyncCall, from: ProjectRef, to: ProjectRef, run: CopyRun = {}, report?: Report) => {
  const inspected = await call<SyncInspect>({ type: 'sync.inspect', path: from.path }, from.device)
  if (inspected.blocked) throw new Error(inspected.blocked)
  if (inspected.git) {
    const exported = await call<SyncExport>({ type: 'sync.export', path: from.path, kind: 'history' }, from.device)
    await move(call, from, to, exported, 'history', report)
    await call({ type: 'sync.import', transfer: exported.transfer, kind: 'history', path: to.path, chunks: exported.chunks, branch: exported.branch, remotes: exported.remotes }, to.device)
  }
  await sendSnapshot(call, from, to, 'replace', report)
  await linkProjects(call, from, to)
  if (!run.setup) return
  report?.({ phase: 'setup', sent: 0, total: 1, text: `Running ${run.setup}` })
  await call({ type: 'sync.setup', path: to.path, command: run.setup }, to.device)
}
