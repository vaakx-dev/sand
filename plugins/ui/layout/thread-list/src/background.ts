import type { NavItem } from '@sand/dom'
import type { AgentRun } from '@sand/web-client/contract'
import type { Context } from 'drydock'

export interface Background {
  count: number
  since?: number
  workflow?: NavItem['workflow']
}

export type BackgroundOf = (thread: string) => Background

const busy = (run: AgentRun) => Math.max(1, run.agents.filter(agent => agent.running).length)

const progress = (run: AgentRun) => ({ done: run.agents.filter(agent => !agent.running).length, total: run.agents.length })

export const backgroundOf =
  (ctx: Context): BackgroundOf =>
  thread => {
    const running = ctx.jobs?.runs(thread).filter(run => run.status === 'running') ?? []
    if (!running.length) return { count: 0 }
    const only = running.length === 1 && running[0]!.kind === 'workflow' ? running[0] : undefined
    return {
      count: running.reduce((sum, run) => sum + busy(run), 0),
      since: Math.min(...running.map(run => run.started)),
      ...(only && { workflow: progress(only) }),
    }
  }

export const noBackground: BackgroundOf = () => ({ count: 0 })
