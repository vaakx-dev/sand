import type { Project, ProjectList } from '@sand/host-projects/contract'
import type { DeviceInfo, WireRequest } from '@sand/protocol'
import type { Session, SessionSummary, ThreadLink } from '@sand/sessions-sqlite/contract'

export interface Pc {
  id: string
  name: string
  here: boolean
}

export interface ReachablePc extends Pc {
  online: boolean
  error?: string
}

export interface FoundThread {
  pc: Pc
  thread: SessionSummary
}

export interface Pcs {
  here(): Promise<DeviceInfo>
  list(): Promise<ReachablePc[]>
  find(ref?: string): Promise<Pc>
  call<T = unknown>(request: WireRequest, pc: string, timeout?: number): Promise<T>
  fetch(path: string, init: RequestInit | undefined, pc: string): Promise<Response>
  threads(pc: Pc): Promise<SessionSummary[]>
  thread(ref: string, pc?: string): Promise<FoundThread>
  threadOrOwn(own: Session, ref?: string, pc?: string): Promise<FoundThread>
  remember(thread: string, pc: Pc): void
  link(session: Session): Promise<ThreadLink>
  projects(pc: Pc): Promise<ProjectList>
  project(ref: string): Promise<Project>
}

declare module 'drydock' {
  interface Services {
    pcs: Pcs
  }
}
