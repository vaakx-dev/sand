import type { ProjectRef, SyncChunk, SyncExport, SyncProgress } from '@sand/protocol'
import type { SyncCall } from './call'

export type Report = (progress: SyncProgress) => void

export const move = async (call: SyncCall, from: ProjectRef, to: ProjectRef, exported: SyncExport, phase: 'history' | 'files', report?: Report) => {
  for (let index = 0; index < exported.chunks; index++) {
    const { data } = await call<SyncChunk>({ type: 'sync.pull', transfer: exported.transfer, index }, from.device)
    await call({ type: 'sync.push', transfer: exported.transfer, index, data }, to.device)
    report?.({ phase, sent: index + 1, total: exported.chunks, text: phase === 'history' ? 'Sending git history' : 'Sending files' })
  }
}
