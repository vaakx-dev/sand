import { pcHello, pcs, wire, type WireListen } from '@sand/devices-contract'
import { joinDisposers } from '@sand/util'
import { definePlugin } from 'drydock'
import { helloJobs, jobCancel, jobEndWire, jobNoteWire, jobs, jobsChange, jobStartWire, type JobNote, type Jobs, type JobState, type WireJob } from '../contract'

const everyPc: WireListen = { from: 'all' }

const seed = (job: WireJob, known?: JobState): JobState => ({ ...job, notes: known?.notes.length ? known.notes : job.note ? [job.note] : [] })

export default definePlugin({
  name: 'jobs-web',
  description: 'Keeps the background jobs of each PC on the page, for the Agents panel and the agent tool cards',
  inject: { wire, pcs },
  apply(ctx) {
    const devices = new Map<string, Map<string, JobState>>()
    const changed = () => ctx.emit(jobsChange)
    const deviceOf = (id: string) => [...devices].find(([, found]) => found.has(id))?.[0]

    const keep = (job: WireJob, device: string) => {
      const known = devices.get(device) ?? new Map<string, JobState>()
      devices.set(device, known.set(job.id, seed(job, known.get(job.id))))
      changed()
    }

    const note = ({ id, text }: JobNote, device: string) => {
      const job = devices.get(device)?.get(id)
      if (!job) return
      job.notes = [...job.notes, text]
      changed()
    }

    const hello = (device: string) => {
      const listed = ctx.wire.hello(helloJobs, device) ?? []
      const previous = devices.get(device)
      devices.set(device, new Map(listed.map(job => [job.id, seed(job, previous?.get(job.id))])))
      changed()
    }

    ctx.on(pcHello, hello)
    for (const pc of ctx.pcs.list()) if (ctx.wire.ready(pc.id)) hello(pc.id)
    ctx.effect(() =>
      joinDisposers(
        ctx.wire.on(jobStartWire, keep, everyPc),
        ctx.wire.on(jobEndWire, ([job], device) => keep(job, device), everyPc),
        ctx.wire.on(jobNoteWire, note, everyPc),
      ),
    )

    const service: Jobs = {
      list: parent => [...devices.values()].flatMap(known => [...known.values()]).filter(job => !parent || job.parent === parent),
      cancel: id => ctx.wire.call(jobCancel, { job: id }, deviceOf(id)).then(() => undefined),
    }
    ctx.provide(jobs, service)
  },
})
