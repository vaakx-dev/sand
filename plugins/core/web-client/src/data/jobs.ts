import type { JobNote, WireJob } from '@sand/agents/contract'
import type { Hello, WireEvent } from '@sand/protocol'
import type { Jobs, JobState, Wire } from '../contract'
import type { Context } from 'drydock'
import { thisDevice } from '../remotes/route'
import type { Store } from '../threads/store'
import { createRuns } from './runs'

const seed = (job: WireJob, known?: JobState): JobState => ({
  ...job,
  notes: known?.notes.length ? known.notes : job.note ? [job.note] : [],
})

export const createJobs = (ctx: Context, wire: Wire, store: Store) => {
  const devices = new Map<string, Map<string, JobState>>()
  const changed = () => ctx.emit('jobs.change')
  const on = (device: string) => devices.get(device) ?? devices.set(device, new Map()).get(device)!
  const deviceOf = (id: string) => [...devices].find(([, jobs]) => jobs.has(id))?.[0]

  const keep = (device: string, job: WireJob) => {
    const jobs = on(device)
    jobs.set(job.id, seed(job, jobs.get(job.id)))
    changed()
  }

  const note = (device: string, { id, text }: JobNote) => {
    const job = devices.get(device)?.get(id)
    if (!job) return
    job.notes = [...job.notes, text]
    changed()
  }

  const hello = (device: string, { jobs }: Hello) => {
    const previous = devices.get(device)
    devices.set(device, new Map(jobs.map(job => [job.id, seed(job, previous?.get(job.id))])))
    changed()
  }

  const event = (device: string, event: WireEvent) => {
    if (event.name === 'job.note') note(device, event.args[0])
    if (event.name === 'job.start' || event.name === 'job.end') keep(device, event.args[0].$job)
  }

  const forget = (device: string) => {
    if (devices.delete(device)) changed()
  }

  ctx.on('wire.hello', received => hello(thisDevice, received))
  ctx.on('wire.event', received => event(thisDevice, received))

  const list = (parent?: string) => [...devices.values()].flatMap(known => [...known.values()]).filter(job => !parent || job.parent === parent)
  const jobs: Jobs = {
    list,
    runs: createRuns(ctx, store, list),
    cancel: id => wire.call({ type: 'job.cancel', job: id }, deviceOf(id)).then(() => undefined),
  }
  return { jobs, hello, event, forget }
}
