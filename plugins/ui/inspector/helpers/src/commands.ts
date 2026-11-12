import { jobs, jobsChange, type Jobs, type JobStatus, type WireJob } from '@sand/jobs/contract'
import { pulse } from '@sand/reactive'
import { copyPathAction } from '@sand/threads-home/contract'
import type { Kit, MenuSpec } from '@sand/ui-kit/contract'
import type { Row, Status, Subject } from '@sand/ui-shell/contract'
import type { Context } from 'drydock'
import { helperCard, stopAction } from './line'

const SHOWN_FINISHED = 3

const DAY_MS = 24 * 60 * 60 * 1000

const statuses: Record<JobStatus, Status> = { running: 'running', done: 'done', failed: 'failed', cancelled: 'stopped' }

const captionOf = (running: number) => (running ? `Background commands · ${running} running` : 'Background commands')

const keyOf = (job: WireJob) => `${job.id} ${job.status}`

const rowOf = (job: WireJob): Row => ({ id: job.id, label: job.label, status: statuses[job.status], at: job.started })

const newestFirst = (a: WireJob, b: WireJob) => (b.ended ?? b.started) - (a.ended ?? a.started)

const listedOf = (all: WireJob[]) => {
  const since = Date.now() - DAY_MS
  const running = all.filter(job => job.status === 'running').toSorted(newestFirst)
  const finished = all.filter(job => job.status !== 'running' && (job.ended ?? 0) >= since).toSorted(newestFirst)
  return [...running, ...finished.slice(0, SHOWN_FINISHED)]
}

export const commandsOf = (ctx: Context, kit: Kit) => {
  const changes = pulse(ctx, [jobsChange], [jobs])

  const service = (): Jobs | undefined => {
    changes.version.get()
    return ctx.get(jobs)
  }

  const listedIn = (subject: Subject) => listedOf(service()?.list(subject.session) ?? [])

  const runningIn = (subject: Subject) => listedIn(subject).filter(job => job.status === 'running').length

  const menuOf = (job: WireJob): MenuSpec => ({
    title: job.label,
    actions: [
      copyPathAction(kit, job.cwd),
      { id: 'copy-command', group: 'copy', label: 'Copy command', icon: 'term', run: () => kit.copyText(job.command) },
      ...(job.status === 'running' ? [stopAction(() => void service()?.cancel(job.id))] : []),
    ],
  })

  const render = (subject: () => Subject) =>
    helperCard(kit, {
      caption: () => captionOf(runningIn(subject())),
      items: () => listedIn(subject()),
      key: keyOf,
      line: job => ({ row: () => rowOf(job), menu: () => menuOf(job) }),
    })

  return { shows: (subject: Subject) => listedIn(subject).length > 0, render }
}
