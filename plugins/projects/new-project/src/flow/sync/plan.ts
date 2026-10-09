import type { ProjectRef } from '@sand/host-projects/contract'
import type { SyncInspect } from '@sand/sync/contract'
import type { CopyDone } from '../../contract'

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
