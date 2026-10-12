import type { JobKind } from '@sand/messages'
import type { Session } from '@sand/sessions-sqlite/contract'

export type { JobKind }

export type JobStatus = 'running' | 'done' | 'failed' | 'cancelled'

export interface Job {
  id: string
  kind: JobKind
  label: string
  parent: string
  origin?: string
  status: JobStatus
  started: number
  ended?: number
  note?: string
  cancel(): void
}

export type JobWork = (signal: AbortSignal, job: Job) => Promise<string>

export interface JobSpec {
  kind: JobKind
  parent: Session
  label: string
  origin?: string
  work: JobWork
  read?(cursor?: number): string | Promise<string>
  send?(message: string, job: Job): string | Promise<string>
}

export interface BackgroundJobs {
  start(spec: JobSpec): Job
  resume(job: Job, work: JobWork): void
  list(parent?: Session): Job[]
  queued(parent: string): number
}

export type WireJob = Omit<Job, 'cancel'>

export interface WireJobRef {
  $job: WireJob
}

export interface JobNote {
  id: string
  label: string
  text: string
}

declare module 'drydock' {
  interface Services {
    backgroundJobs: BackgroundJobs
  }

  interface Events {
    'job.start': (job: Job) => void
    'job.end': (job: Job, output: string) => void
    'job.note': (note: JobNote) => void
  }
}

declare module '@sand/protocol/wire' {
  interface WireRequests {
    'job.cancel': { job: string }
  }

  interface WireEvents {
    'job.start': [job: WireJobRef]
    'job.end': [job: WireJobRef, output: string]
    'job.note': [note: JobNote]
  }

  interface HelloFields {
    jobs: WireJob[]
  }
}

declare module '@sand/protocol' {
  interface RuntimeActivity {
    jobs: WireJob[]
  }
}
