import type { NavItem } from '@sand/protocol'
import type { AgentRun } from '@sand/web-client/contract'
import type { Context } from 'drydock'

export interface Background {
  agents: number
  shells: number
  since?: number
  workflow?: NavItem['workflow']
}

export type BackgroundOf = (thread: string) => Background

const busy = (run: AgentRun) => Math.max(1, run.agents.length - run.finished)

const progress = (run: AgentRun) => ({ done: run.finished, total: run.agents.length })

export const backgroundOf =
  (ctx: Context): BackgroundOf =>
  thread => {
    const running = ctx.jobs?.running(thread) ?? []
    const [first, ...others] = running
    if (!first) return { agents: 0, shells: 0 }
    return {
      agents: running.filter(run => run.kind !== 'shell').reduce((sum, run) => sum + busy(run), 0),
      shells: running.filter(run => run.kind === 'shell').length,
      since: Math.min(...running.map(run => run.started)),
      workflow: !others.length && first.kind === 'workflow' ? progress(first) : undefined,
    }
  }
