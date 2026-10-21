import type { Session } from '@sand/chats/contract'
import { helloField, request, type, wireEvent } from '@sand/host-hub/contract'
import { event, service } from 'drydock'
import { z } from 'zod'

export type JobKind = 'agent'

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
}

export type WireJob = Omit<Job, 'cancel'>

export interface JobNote {
  id: string
  label: string
  text: string
}

export const backgroundJobs = service<BackgroundJobs>('backgroundJobs')

export const jobStart = event<(job: Job) => void>('job.start')
export const jobEnd = event<(job: Job, output: string) => void>('job.end')
export const jobNote = event<(note: JobNote) => void>('job.note')

export const jobStartWire = wireEvent<WireJob>('job.start')
export const jobEndWire = wireEvent<[job: WireJob, output: string]>('job.end')
export const jobNoteWire = wireEvent<JobNote>('job.note')

export const helloJobs = helloField<WireJob[]>('jobs')

export const jobCancel = request('job.cancel', { input: z.object({ job: z.string() }), output: type<boolean>() })

export interface JobState extends WireJob {
  notes: string[]
}

export interface Jobs {
  list(parent?: string): JobState[]
  cancel(id: string): Promise<void>
}

export const jobs = service<Jobs>('jobs')
export const jobsChange = event<() => void>('jobs.change')
