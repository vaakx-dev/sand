import type { JobStatus, SessionInfo, TurnResult } from '@sand/protocol'
import { duration, oneLine } from '@sand/kit'

export interface JobView {
  id: string
  label: string
  parent: string
  status: JobStatus
  started: number
  ended?: number
}

const since = (at: number) => duration(Date.now() - at)

const agentName = (agent: SessionInfo) => agent.title ?? 'agent'

export const agentStarted = (agent: SessionInfo, model?: string) => `▸ ${agentName(agent)}${model ? ` · ${model}` : ''}`

export const agentEnded = (agent: SessionInfo, result: TurnResult) => {
  if (result.error) return `✗ ${agentName(agent)}: ${oneLine(result.error, 120)}`
  if (result.stopReason === 'interrupted') return `■ ${agentName(agent)} stopped after ${since(agent.created)}`
  return `✓ ${agentName(agent)} finished in ${since(agent.created)}`
}

export const jobEnded = (job: JobView) => `${job.status === 'done' ? '◇' : '✗'} ${job.label} ${job.status} after ${duration((job.ended ?? Date.now()) - job.started)}`
