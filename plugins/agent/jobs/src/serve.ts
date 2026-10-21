import { server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import type { Context } from 'drydock'
import { helloJobs, jobCancel, jobEnd, jobEndWire, jobNote, jobNoteWire, jobStart, jobStartWire, type Job, type WireJob } from './contract'
import type { Store } from './store'

const wireJob = ({ cancel: _, ...job }: Job): WireJob => job

export const serveJobs = (ctx: Context, store: Store) =>
  ctx.watch(server, found => {
    if (!found) return
    return joinDisposers(
      found.hello(helloJobs, () => store.list().map(wireJob)),
      found.handle(jobCancel, ({ job }) => {
        store
          .list()
          .find(candidate => candidate.id === job)
          ?.cancel()
        return true
      }),
      ctx.on(jobStart, job => found.broadcast(jobStartWire, wireJob(job))),
      ctx.on(jobEnd, (job, output) => found.broadcast(jobEndWire, [wireJob(job), output])),
      ctx.on(jobNote, note => found.broadcast(jobNoteWire, note)),
    )
  })
