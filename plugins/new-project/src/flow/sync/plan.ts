import type { ProjectRef, SyncInspect } from '@sand/protocol'

export interface CopyPlan {
  name: string
  from: ProjectRef
  to: ProjectRef
  inspect: SyncInspect
  create: boolean
  existing: number
}
