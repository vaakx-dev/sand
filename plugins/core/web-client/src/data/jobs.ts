import type { JobNote, JobState, Jobs, Wire, WireJob } from '@sand/protocol'
import type { Context } from 'drydock'

const seed = (job: WireJob, known?: JobState): JobState => ({
  ...job,
  notes: known?.notes.length ? known.notes : job.note ? [job.note] : [],
})

export const createJobs = (ctx: Context, wire: Wire): Jobs => {
  let jobs = new Map<string, JobState>()
  const changed = () => ctx.emit('jobs.change')

  const store = (job: WireJob) => {
    jobs.set(job.id, seed(job, jobs.get(job.id)))
    changed()
  }

  const note = ({ id, text }: JobNote) => {
    const job = jobs.get(id)
    if (!job) return
    job.notes = [...job.notes, text]
    changed()
  }

  ctx.on('wire.hello', hello => {
    const previous = jobs
    jobs = new Map(hello.jobs.map(job => [job.id, seed(job, previous.get(job.id))]))
    changed()
  })
  ctx.on('wire.event', event => {
    if (event.name === 'job.note') note(event.args[0])
    if (event.name === 'job.start' || event.name === 'job.end') store(event.args[0].$job)
  })
  return {
    list: parent => [...jobs.values()].filter(job => !parent || job.parent === parent),
    cancel: id => wire.call({ type: 'job.cancel', job: id }).then(() => undefined),
  }
}
