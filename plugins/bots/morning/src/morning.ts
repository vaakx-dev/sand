import { byStatus, type Job, type MorningEntry } from '@sand/bots/contract'

const DAY_MS = 86_400_000

const recentText = (job: Job, since: number) => {
  const recent = job.runs.filter(run => run.at >= since)
  const worked = recent.find(run => run.outcome !== 'nothing')
  if (worked) return worked.summary
  return recent.length ? 'Nothing to do' : 'No runs since yesterday'
}

const textOf = (job: Job, since: number) => {
  switch (job.status) {
    case 'needs':
      return job.ask?.question ?? ''
    case 'paused':
      return ''
    case 'on':
      return recentText(job, since)
  }
}

export const morningOf = (jobs: Job[], at: number): MorningEntry => ({
  lines: jobs.toSorted(byStatus).map(job => ({ job: job.id, title: job.title, status: job.status, text: textOf(job, at - DAY_MS) })),
})
