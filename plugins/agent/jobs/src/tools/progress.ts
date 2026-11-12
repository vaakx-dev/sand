import { joinDisposers, oneLine } from '@sand/util'
import type { JobsContext } from '../context'
import { jobEnd, jobNote, type Job } from '../contract'
import type { Entry } from '../store'

const flushEvery = 1_000
const labelLength = 40

export const showProgress = (ctx: JobsContext, entries: Entry[], progress: (text: string) => void) => {
  const changed = new Map<Job, string>()
  let timer: Timer | undefined

  const line = (job: Job, activity: string) => {
    const done = entries.filter(entry => entry.job.status !== 'running').length
    return `${done}/${entries.length} done · ${oneLine(job.label, labelLength)} · ${activity}`
  }
  const flush = () => {
    timer = undefined
    progress([...changed].map(([job, activity]) => line(job, activity)).join('\n'))
    changed.clear()
  }
  const update = (job: Job, activity: string) => {
    changed.set(job, activity)
    timer ??= setTimeout(flush, flushEvery)
  }
  const find = (match: (job: Job) => boolean) => entries.find(({ job }) => match(job))?.job

  for (const { job } of entries) if (job.status === 'running') changed.set(job, job.note ?? 'running')
  if (changed.size) flush()

  return joinDisposers(
    ctx.on(jobNote, ({ id, text }) => {
      const job = find(candidate => candidate.id === id)
      if (job) update(job, text)
    }),
    ctx.on(jobEnd, ended => {
      if (find(candidate => candidate === ended)) update(ended, ended.status)
    }),
    () => clearTimeout(timer),
  )
}
