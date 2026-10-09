import type { ProjectRef } from '@sand/host-projects/contract'
import type { SyncApplied } from '@sand/sync/contract'
import type { SyncCall } from './call'
import type { Report } from './move'
import { sendSnapshot } from './snapshot'

export const sendProject = async (call: SyncCall, from: ProjectRef, to: ProjectRef, report?: Report): Promise<SyncApplied> => {
  const applied = await sendSnapshot(call, from, to, 'merge', report)
  if (applied.result === 'merged') await sendSnapshot(call, to, from, 'merge', report)
  return applied
}
