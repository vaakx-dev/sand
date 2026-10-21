import type { JobState, JobStatus } from '@sand/jobs/contract'
import type { Thread } from '@sand/web-client/contract'
import { inputText, type Calls } from './calls'
import type { ModelOf } from './models'
import { currentStep } from './step'
import { agentTitle } from './title'

export interface Run {
  id: string
  name: string
  title: string
  model?: string
  status: JobStatus
  started: number
  ended?: number
  step?: string
  job?: string
  session?: string
}

export interface RunSources {
  jobs: JobState[]
  agents: Thread[]
  calls: Calls
  modelOf: ModelOf
}

const splitLabel = ({ kind, label }: JobState) => {
  const at = label.indexOf(': ')
  return at > 0 ? { name: label.slice(0, at), task: label.slice(at + 2) } : { name: kind, task: label }
}

const startedBy = (agent: Thread, calls: Calls) => {
  const call = agent.info.origin ? calls.get(agent.info.origin) : undefined
  if (!call) return {}
  return { name: inputText(call.input, 'agent') || 'general', label: inputText(call.input, 'label') || undefined }
}

const agentPart = (agent: Thread, running: boolean, modelOf: ModelOf) => ({
  session: agent.id,
  model: modelOf(agent),
  step: running ? currentStep(agent) : undefined,
})

const jobRun = (job: JobState, agent: Thread | undefined, modelOf: ModelOf): Run => {
  const { name, task } = splitLabel(job)
  return {
    id: job.id,
    name,
    title: agentTitle(agent?.info.title ?? task),
    status: job.status,
    started: job.started,
    ...(job.ended && { ended: job.ended }),
    job: job.id,
    ...(agent && agentPart(agent, job.status === 'running', modelOf)),
  }
}

const agentRun = (agent: Thread, calls: Calls, modelOf: ModelOf): Run => {
  const origin = startedBy(agent, calls)
  return {
    id: agent.id,
    name: origin.name ?? 'agent',
    title: origin.label ?? agentTitle(agent.info.title),
    status: agent.running ? 'running' : 'done',
    started: agent.info.created,
    ...(!agent.running && { ended: agent.info.updated }),
    ...agentPart(agent, agent.running, modelOf),
  }
}

export const toRuns = ({ jobs, agents, calls, modelOf }: RunSources): Run[] => {
  const loose = new Map(agents.map(agent => [agent.id, agent]))
  const byOrigin = new Map(agents.filter(agent => agent.info.origin).map(agent => [agent.info.origin, agent]))
  const result = jobs.map(job => {
    const agent = job.origin ? byOrigin.get(job.origin) : undefined
    if (agent) loose.delete(agent.id)
    return jobRun(job, agent, modelOf)
  })
  result.push(...[...loose.values()].map(agent => agentRun(agent, calls, modelOf)))
  return result.sort((a, b) => b.started - a.started)
}
