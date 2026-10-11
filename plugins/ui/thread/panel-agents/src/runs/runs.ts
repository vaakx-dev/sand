import type { AgentRun, Thread } from '@sand/web-client/contract'
import { agentTitle } from '@sand/kit'
import { startedBy, type Calls } from './origin'
import { currentStep } from './step'

export type ModelOf = (thread: Thread) => string | undefined

export interface Member {
  id: string
  title: string
  model?: string
  running: boolean
  started: number
  ended?: number
}

export interface Run {
  id: string
  kind: AgentRun['kind']
  name: string
  title: string
  model?: string
  status: AgentRun['status']
  started: number
  ended?: number
  note?: string
  step?: string
  job?: string
  session?: string
  members: Member[]
  finished: number
}

const member = (thread: Thread, modelOf: ModelOf): Member => ({
  id: thread.id,
  title: agentTitle(thread.info.title),
  model: modelOf(thread),
  running: thread.running,
  started: thread.info.created,
  ended: thread.running ? undefined : thread.info.updated,
})

const solo = (run: AgentRun, calls: Calls, modelOf: ModelOf) => {
  const thread = run.agents[0]
  if (!thread) return {}
  const origin = run.job ? {} : startedBy(thread, calls)
  return {
    name: origin.name ?? run.name,
    title: origin.label ?? run.title,
    model: modelOf(thread),
    step: run.status === 'running' ? currentStep(thread) : undefined,
  }
}

export const toRuns = (runs: AgentRun[], calls: Calls, modelOf: ModelOf): Run[] =>
  runs.map(run => {
    const { agents, ...rest } = run
    return {
      ...rest,
      ...(run.kind === 'agent' && solo(run, calls, modelOf)),
      members: agents.map(agent => member(agent, modelOf)),
    }
  })
