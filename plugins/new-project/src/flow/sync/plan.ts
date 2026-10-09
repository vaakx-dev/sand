import type { CopyDone, ProjectRef, SyncInspect } from '@sand/protocol'

export interface CopyTarget {
  id: string
  name: string
}

export interface CopyPlan {
  project: string
  name: string
  from: ProjectRef
  to: ProjectRef
  inspect: SyncInspect
  create: boolean
  existing: number
  done?: CopyDone
}
