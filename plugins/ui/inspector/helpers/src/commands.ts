import { jobs, jobsChange, type Jobs, type WireJob } from '@sand/jobs/contract'
import { pulse } from '@sand/reactive'
import { copyPathAction } from '@sand/threads-home/contract'
import type { Kit, MenuSpec } from '@sand/ui-kit/contract'
import type { Row, Subject } from '@sand/ui-shell/contract'
import type { Context } from 'drydock'
import { helperCard, stopAction } from './line'

const keyOf = (job: WireJob) => job.id

const rowOf = (job: WireJob): Row => ({ id: job.id, label: job.label, status: 'running', at: job.started })

const newestFirst = (a: WireJob, b: WireJob) => b.started - a.started

const runningOf = (all: WireJob[]) => all.filter(job => job.status === 'running').toSorted(newestFirst)

export const commandsOf = (ctx: Context, kit: Kit) => {
  const changes = pulse(ctx, [jobsChange], [jobs])

  const service = (): Jobs | undefined => {
    changes.version.get()
    return ctx.get(jobs)
  }

  const runningIn = (subject: Subject) => runningOf(service()?.list(subject.session) ?? [])

  const menuOf = (job: WireJob): MenuSpec => ({
    title: job.label,
    actions: [
      copyPathAction(kit, job.cwd),
      { id: 'copy-command', group: 'copy', label: 'Copy command', icon: 'term', run: () => kit.copyText(job.command) },
      stopAction(() => void service()?.cancel(job.id)),
    ],
  })

  const render = (subject: () => Subject) =>
    helperCard(kit, {
      caption: 'Background commands',
      items: () => runningIn(subject()),
      key: keyOf,
      line: job => ({ row: () => rowOf(job), menu: () => menuOf(job) }),
    })

  return { shows: (subject: Subject) => runningIn(subject).length > 0, render }
}
