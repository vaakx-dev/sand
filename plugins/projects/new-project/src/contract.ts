import type { ProjectRef } from '@sand/host-projects/contract'
import type { SyncApplied, SyncInspect, SyncPick, SyncProgress, SyncRelation, SyncResolved, SyncSetup, SyncState } from '@sand/sync/contract'
import type { ProjectGroup } from '@sand/web-client/contract'

export interface CopyOptions {
  setup?: string
  project?: string
}

export interface Sync {
  state(ref: ProjectRef): SyncState | undefined
  refresh(ref: ProjectRef): Promise<SyncState | undefined>
  relation(ref: ProjectRef, against: ProjectRef): SyncRelation | undefined
  inspect(ref: ProjectRef): Promise<SyncInspect>
  copy(from: ProjectRef, to: ProjectRef, options?: CopyOptions, progress?: (progress: SyncProgress) => void): Promise<void>
  send(from: ProjectRef, to: ProjectRef, progress?: (progress: SyncProgress) => void): Promise<SyncApplied>
  resolve(ref: ProjectRef, picks: Record<string, SyncPick>): Promise<SyncResolved>
  setup(ref: ProjectRef, command: string): Promise<SyncSetup>
}

export type CopyDone = (to: ProjectRef) => void | Promise<void>

export interface SyncFlows {
  copy(group: ProjectGroup, device?: string, then?: CopyDone): void
  add(group: ProjectGroup): void
  send(from: ProjectRef, to: ProjectRef): void
  resolve(ref: ProjectRef): void
}

declare module 'drydock' {
  interface Services {
    sync: Sync
    syncFlows: SyncFlows
  }

  interface Events {
    'sync.change': () => void
  }
}
