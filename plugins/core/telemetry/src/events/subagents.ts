import type { Session } from '@sand/sessions-sqlite/contract'
import type { Context } from 'drydock'
import type { Capture } from '../capture'

const shared = new Set(['general', 'explore'])

export interface WorkflowLinks {
  claim(origin: string | null): void
  has(origin: string | null): boolean
}

const agentOf = (session: Session) => {
  const entry = session.path().find(candidate => candidate.type === 'agent')
  const name = (entry?.data as { name?: string } | undefined)?.name ?? 'general'
  return shared.has(name) ? name : 'custom'
}

export const watchSubagents = (ctx: Context, capture: Capture, workflows: WorkflowLinks) => {
  const seen = new Set<string>()

  ctx.on('agent.start', session => workflows.claim(session.origin))
  ctx.on('session.remove', session => void seen.delete(session.id))

  const finished = (session: Session, properties: Record<string, unknown>) => {
    const followup = seen.has(session.id)
    seen.add(session.id)
    capture('subagent.finished', { ...properties, agent: agentOf(session), in_workflow: workflows.has(session.origin), followup })
  }

  return { finished }
}
