import type { EventName } from 'drydock'
import type { ServerContext } from '../context'

const forwarded: EventName[] = [
  'turn.start',
  'turn.end',
  'turn.steer',
  'turn.continue',
  'llm.event',
  'llm.limits',
  'tool.start',
  'tool.result',
  'agent.start',
  'agent.end',
  'job.start',
  'job.end',
  'job.note',
  'session.entry',
  'session.update',
  'session.remove',
  'artifact.saved',
]

export const forwardEvents = (ctx: ServerContext, broadcast: (name: string, args: unknown[]) => void) => {
  for (const name of forwarded) ctx.on(name, (...args: unknown[]) => broadcast(name, args))
}
