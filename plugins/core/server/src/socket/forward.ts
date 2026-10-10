import type { EventName } from 'drydock'
import type { ServerContext } from '../context'
import { sessionRef } from '../stream/wire'
import { isSession } from './serialize'

const forwarded: EventName[] = [
  'turn.start',
  'turn.end',
  'turn.steer',
  'turn.continue',
  'llm.limits',
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

const slimmed: EventName[] = ['tool.start', 'tool.result']

const slim = (args: unknown[]) => args.map(arg => (arg && typeof arg === 'object' && isSession(arg) ? sessionRef(arg) : arg))

export const forwardEvents = (ctx: ServerContext, broadcast: (name: string, args: unknown[]) => void) => {
  for (const name of forwarded) ctx.on(name, (...args: unknown[]) => broadcast(name, args))
  for (const name of slimmed) ctx.on(name, (...args: unknown[]) => broadcast(name, slim(args)))
}
