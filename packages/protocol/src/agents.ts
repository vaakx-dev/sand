import type { Dispose } from 'drydock'
import type { Effort } from './llm'
import type { TurnResult } from './loop'
import type { Session } from './session'

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
