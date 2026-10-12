import type { Session } from '@sand/sessions-sqlite/contract'
import { oneLine, textOf } from '@sand/kit'
import type { Context } from 'drydock'

const latest = (session: Session) => {
  const reply = session.messages().findLast(message => message.role === 'assistant' && textOf(message.content))
  return reply ? oneLine(textOf(reply.content), 1000) : '(no output yet)'
}

const agentLine = (ctx: Context<'loop' | 'sessions'>, id: string) => {
  const session = ctx.sessions.require(id)
  return `${id} · ${session.title ?? 'agent'} · ${ctx.loop.active(session) ? 'running' : 'finished'}\n${latest(session)}`
}

export const readAgents = (ctx: Context<'loop' | 'sessions'>, parent: Session, origin: string) => {
  const agents = ctx.sessions.children(parent.id).filter(child => child.origin === origin)
  return agents.length ? agents.map(agent => agentLine(ctx, agent.id)).join('\n\n') : 'No agents have started yet.'
}
