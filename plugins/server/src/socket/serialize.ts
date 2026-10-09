import type { Job, Session, SessionInfo, WireJob } from '@sand/protocol'

const isSession = (value: object): value is Session =>
  typeof (value as Session).path === 'function' && typeof (value as Session).append === 'function'

const isJob = (value: object): value is Job => typeof (value as Job).cancel === 'function' && 'status' in value

export const info = (session: Session): SessionInfo => ({
  id: session.id,
  created: session.created,
  cwd: session.cwd,
  project: session.project,
  title: session.title,
  head: session.head,
  parent: session.parent,
  origin: session.origin,
  kind: session.kind,
})

const jobData = ({ cancel, ...job }: Job): WireJob => job

export const serialize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(serialize)
  if (value instanceof AbortSignal) return undefined
  if (!value || typeof value !== 'object') return value
  if (isSession(value)) return { $session: info(value) }
  if (isJob(value)) return { $job: jobData(value) }
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entry]) => typeof entry !== 'function')
      .map(([key, entry]) => [key, serialize(entry)]),
  )
}
