import type { Job, WireJob } from './contract'
import type { Context } from 'drydock'
import type { Store } from './store'

const wireJob = ({ cancel: _, ...job }: Job): WireJob => job

export const serveJobs = (ctx: Context, store: Store) => {
  ctx.on('server.hello', hello => ({ ...hello, jobs: store.list().map(wireJob) }))
  ctx.watch('server', server =>
    server?.handle('job.cancel', ({ job }) => {
      store
        .list()
        .find(candidate => candidate.id === job)
        ?.cancel()
      return true
    }),
  )
}
