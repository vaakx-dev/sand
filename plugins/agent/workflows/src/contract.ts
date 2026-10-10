import type { Session } from '@sand/sessions-sqlite/contract'

export type WorkflowStatus = 'done' | 'failed' | 'cancelled'

export interface WorkflowRun {
  run: string
  origin: string
  parent: Session
  resumed: boolean
  background: boolean
}

declare module 'drydock' {
  interface Events {
    'workflow.start': (run: WorkflowRun) => void
    'workflow.end': (run: WorkflowRun, status: WorkflowStatus) => void
  }
}
