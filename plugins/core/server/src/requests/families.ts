import type { Hello } from '@sand/protocol'
import type { ServerContext } from '../context'

export const withBusyFamilies = (ctx: ServerContext, hello: Hello, active: string[]): Hello => {
  const parents = new Set([...active, ...hello.jobs.filter(job => job.status === 'running').map(job => job.parent)])
  if (!parents.size) return hello
  const known = new Set(hello.sessions.map(session => session.id))
  const children = [...parents].flatMap(parent => ctx.sessions.children(parent)).filter(child => !known.has(child.id) && known.add(child.id))
  return children.length ? { ...hello, sessions: [...hello.sessions, ...children] } : hello
}
