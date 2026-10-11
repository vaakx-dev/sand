import { isRecord } from '@sand/kit'
import type { Session } from '@sand/sessions-sqlite/contract'
import type { Context } from 'drydock'
import type { Capture } from '../capture'
import type { Workflows } from './workflows'

const shared = new Set(['general', 'explore'])

const agentOf = (session: Session) => {
  const data = session.path().find(candidate => candidate.type === 'agent')?.data
  const name = isRecord(data) && typeof data.name === 'string' ? data.name : 'general'
  return shared.has(name) ? name : 'custom'
}

export const watchSubagents = (ctx: Context, capture: Capture, workflows: Workflows) => {
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
