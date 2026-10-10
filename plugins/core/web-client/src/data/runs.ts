import type { AgentRun, JobState, Thread } from '../contract'
import type { Context } from 'drydock'
import type { Store } from '../threads/store'

const tidy = (title?: string | null) => {
  const flat = (title ?? '').replace(/\s+/g, ' ').trim()
  return /^.*?[.!?](?=\s|$)/.exec(flat)?.[0] ?? (flat || 'Sub-agent')
}

const agentName = (thread: Thread) => {
  for (const entry of thread.entries.values()) if (entry.type === 'agent') return (entry.data as { name?: string }).name ?? 'agent'
  return 'agent'
}

const splitLabel = (label: string) => {
  if (label.startsWith('workflow ')) return { name: 'workflow', task: label.slice(9), workflow: true }
  const at = label.indexOf(': ')
  return at > 0 ? { name: label.slice(0, at), task: label.slice(at + 2), workflow: false } : { name: 'job', task: label, workflow: false }
}

const callLabel = (parent: Thread | undefined, origin: string) => {
  for (const entry of parent?.entries.values() ?? []) {
    if (entry.type !== 'message') continue
    const content = (entry.data as { content?: { type: string; id?: string; input?: { label?: unknown } }[] }).content ?? []
    const call = content.find(block => block.type === 'tool_call' && block.id === origin)
    if (call) return typeof call.input?.label === 'string' ? call.input.label : undefined
  }
  return undefined
}

const lastEnd = (agents: Thread[]) => Math.max(...agents.map(agent => agent.info.updated))

const jobRun = (job: JobState, agents: Thread[]): AgentRun => {
  const { name, task, workflow } = splitLabel(job.label)
  const single = workflow ? undefined : agents[0]
  return {
    id: job.id,
    kind: workflow ? 'workflow' : 'agent',
    name,
    title: tidy(single?.info.title ?? task),
    status: job.status,
    started: job.started,
    ...(job.ended && { ended: job.ended }),
    ...(job.notes.length && { note: job.notes.at(-1) }),
    job: job.id,
    ...(single && { session: single.id }),
    agents,
  }
}

const sessionRun = (agent: Thread): AgentRun => ({
  id: agent.id,
  kind: 'agent',
  name: agentName(agent),
  title: tidy(agent.info.title),
  status: agent.running ? 'running' : 'done',
  started: agent.info.created,
  ...(!agent.running && { ended: agent.info.updated }),
  session: agent.id,
  agents: [agent],
})

const groupRun = (origin: string, agents: Thread[], parent: Thread | undefined): AgentRun => {
  const running = agents.some(agent => agent.running)
  return {
    id: origin,
    kind: 'workflow',
    name: 'workflow',
    title: tidy(callLabel(parent, origin) ?? 'Workflow'),
    status: running ? 'running' : 'done',
    started: Math.min(...agents.map(agent => agent.info.created)),
    ...(!running && { ended: lastEnd(agents) }),
    agents,
  }
}

export const createRuns = (ctx: Context, store: Store, jobs: (parent: string) => JobState[]) => {
  let index: Map<string, Thread[]> | undefined
  ctx.on('threads.change', () => {
    index = undefined
  })

  const build = () => {
    const built = new Map<string, Thread[]>()
    for (const thread of store.threads.values()) {
      const parent = thread.info.kind === 'agent' ? thread.info.parent : undefined
      if (parent) built.set(parent, [...(built.get(parent) ?? []), thread])
    }
    for (const list of built.values()) list.sort((a, b) => a.info.created - b.info.created)
    return built
  }

  const children = (parent: string) => (index ??= build()).get(parent) ?? []

  const runs = (parent: string): AgentRun[] => {
    const byOrigin = new Map<string, Thread[]>()
    const loose: Thread[] = []
    for (const child of children(parent)) {
      const origin = child.info.origin
      if (origin) byOrigin.set(origin, [...(byOrigin.get(origin) ?? []), child])
      else loose.push(child)
    }
    const result = jobs(parent).map(job => {
      const agents = (job.origin && byOrigin.get(job.origin)) || []
      if (job.origin) byOrigin.delete(job.origin)
      return jobRun(job, agents)
    })
    for (const [origin, agents] of byOrigin) {
      if (agents.length > 1) result.push(groupRun(origin, agents, store.threads.get(parent)))
      else loose.push(...agents)
    }
    result.push(...loose.map(sessionRun))
    return result.sort((a, b) => b.started - a.started)
  }

  return { children, runs }
}
