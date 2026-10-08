import type { Agents, Job, WireJob } from '@sand/protocol'
import type { Context } from 'drydock'

const wireJob = ({ cancel: _, ...job }: Job): WireJob => job

export const serveJobs = (ctx: Context, agents: Agents) => {
  ctx.on('server.hello', hello => ({ ...hello, jobs: agents.jobs().map(wireJob) }))
  ctx.watch('server', server =>
    server?.handle('job.cancel', ({ job }) => {
      agents
        .jobs()
        .find(candidate => candidate.id === job)
        ?.cancel()
      return true
    }),
  )
}
