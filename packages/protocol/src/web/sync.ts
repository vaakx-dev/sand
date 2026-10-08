import type { ProjectRef } from '../projects'
import type { SyncApplied, SyncInspect, SyncPick, SyncProgress, SyncRelation, SyncResolved, SyncSetup, SyncState } from '../sync'
import type { ProjectGroup } from './projects'

export interface CopyOptions {
  setup?: string
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

export interface SyncFlows {
  copy(group: ProjectGroup, device?: string): void
  add(group: ProjectGroup): void
  send(from: ProjectRef, to: ProjectRef): void
  resolve(ref: ProjectRef): void
}
