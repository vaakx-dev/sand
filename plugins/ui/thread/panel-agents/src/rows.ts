import type { JobState, JobStatus, Thread } from '@sand/protocol'
import { startedBy, type Calls } from './origin'

export type ModelOf = (thread: Thread) => string | undefined

export interface ChildRow {
  id: string
  title: string
  model?: string
  running: boolean
  started: number
  ended?: number
}

export interface AgentRow {
  id: string
  name: string
  title: string
  model?: string
  status: JobStatus
  started: number
  ended?: number
  note?: string
  job?: string
  session?: string
  workflow: boolean
  children: ChildRow[]
}

const agentName = (thread: Thread) => {
  for (const entry of thread.entries.values()) if (entry.type === 'agent') return (entry.data as { name?: string }).name ?? 'agent'
  return 'agent'
}

const tidy = (title?: string | null) => {
  const flat = (title ?? '').replace(/\s+/g, ' ').trim()
  return /^.*?[.!?](?=\s|$)/.exec(flat)?.[0] ?? (flat || 'Sub-agent')
}

const childRow = (thread: Thread, modelOf: ModelOf): ChildRow => ({
  id: thread.id,
  title: tidy(thread.info.title),
  model: modelOf(thread),
  running: thread.running,
  started: thread.info.created,
  ...(!thread.running && { ended: thread.info.updated }),
})

const splitLabel = (label: string) => {
  if (label.startsWith('workflow ')) return { name: 'workflow', task: label.slice(9), workflow: true }
  const at = label.indexOf(': ')
  return at > 0 ? { name: label.slice(0, at), task: label.slice(at + 2), workflow: false } : { name: 'job', task: label, workflow: false }
}

const jobRow = (job: JobState, kids: Thread[], modelOf: ModelOf): AgentRow => {
  const { name, task, workflow } = splitLabel(job.label)
  const single = !workflow && kids.length === 1 ? kids[0] : undefined
  return {
    id: job.id,
    name,
    title: tidy(single?.info.title ?? task),
    model: single && modelOf(single),
    status: job.status,
    started: job.started,
    ...(job.ended && { ended: job.ended }),
    ...(job.notes.length && { note: job.notes.at(-1) }),
    job: job.id,
    ...(single && { session: single.id }),
    workflow,
    children: single ? [] : kids.map(kid => childRow(kid, modelOf)),
  }
}

const sessionRow = (thread: Thread, calls: Calls, modelOf: ModelOf): AgentRow => {
  const origin = startedBy(thread, calls)
  return {
    id: thread.id,
    name: origin.name ?? agentName(thread),
    title: origin.label ?? tidy(thread.info.title),
    model: modelOf(thread),
    status: thread.running ? 'running' : 'done',
    started: thread.info.created,
    ...(!thread.running && { ended: thread.info.updated }),
    session: thread.id,
    workflow: false,
    children: [],
  }
}

export const agentRows = (jobs: JobState[], children: Thread[], calls: Calls, modelOf: ModelOf): AgentRow[] => {
  const byOrigin = new Map<string, Thread[]>()
  for (const child of children) if (child.info.origin) byOrigin.set(child.info.origin, [...(byOrigin.get(child.info.origin) ?? []), child])
  const used = new Set<string>()
  const rows = jobs.map(job => {
    const kids = (job.origin && byOrigin.get(job.origin)) || []
    for (const kid of kids) used.add(kid.id)
    return jobRow(job, kids, modelOf)
  })
  for (const child of children) if (!used.has(child.id)) rows.push(sessionRow(child, calls, modelOf))
  return rows.sort((a, b) => b.started - a.started)
}
