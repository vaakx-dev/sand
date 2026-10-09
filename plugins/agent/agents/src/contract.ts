import type { Dispose } from 'drydock'
import type { Effort } from '@sand/llm-accounts/contract'
import type { TurnResult } from '@sand/loops/contract'
import type { Session, WireSession } from '@sand/sessions-sqlite/contract'

export interface AgentDefinition {
  name: string
  description: string
  prompt?: string
  tools?: string[]
  model?: string
  effort?: Effort
}

export interface AgentRequest {
  parent: Session
  task: string
  label?: string
  agent?: string
  model?: string
  effort?: Effort
  origin?: string
  signal?: AbortSignal
  wait?: boolean
}

export interface AgentResult extends TurnResult {
  session: Session
}

export type JobStatus = 'running' | 'done' | 'failed' | 'cancelled'

export interface Job {
  id: string
  label: string
  parent: string
  origin?: string
  status: JobStatus
  started: number
  ended?: number
  note?: string
  cancel(): void
}

export interface Agents {
  define(definition: AgentDefinition): Dispose
  definitions(cwd?: string, project?: string | null): Promise<AgentDefinition[]>
  run(request: AgentRequest): Promise<AgentResult>
  background(parent: Session, label: string, work: (signal: AbortSignal, job: Job) => Promise<string>, origin?: string): Job
  jobs(parent?: Session): Job[]
}

export type WireJob = Omit<Job, 'cancel'>

export interface WireJobRef {
  $job: WireJob
}

export type WireAgentRequest = Omit<AgentRequest, 'parent' | 'signal'> & { parent: WireSession }

export type WireAgentResult = Omit<AgentResult, 'session'> & { session: WireSession }

export interface JobNote {
  id: string
  label: string
  text: string
}

declare module 'drydock' {
  interface Services {
    agents: Agents
  }

  interface Events {
    'agent.start': (session: Session, request: AgentRequest) => void
    'agent.end': (session: Session, result: AgentResult) => void
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
    'agent.start': [session: WireSession, request: WireAgentRequest]
    'agent.end': [session: WireSession, result: WireAgentResult]
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
