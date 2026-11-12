import { inspector } from '@sand/inspector/contract'
import { jobs, jobsChange, type JobStatus, type WireJob } from '@sand/jobs/contract'
import { pulse } from '@sand/reactive'
import { kit, type Tone } from '@sand/ui-kit/contract'
import { shell } from '@sand/ui-shell/contract'
import { models, modelsChange, threadRouteKind, threads, threadsChange } from '@sand/web-client/contract'
import { derive, div, list, span } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'

interface Helper {
  job: WireJob
  model?: string
  thread?: string
}

const looks: Record<JobStatus, { tone: Tone; end?: string }> = {
  running: { tone: 'run' },
  done: { tone: 'success', end: 'done' },
  failed: { tone: 'danger', end: 'failed' },
  cancelled: { tone: 'neutral', end: 'stopped' },
}

const shownOf = (all: WireJob[]) => {
  const agents = all.filter(job => job.kind === 'agent')
  const running = agents.filter(job => job.status === 'running')
  if (!running.length) return []
  const since = Math.min(...running.map(job => job.started))
  return agents.filter(job => job.status === 'running' || (job.ended ?? 0) >= since).toSorted((a, b) => a.started - b.started)
}

const keyOf = ({ job, model, thread }: Helper) => [job.id, job.status, model ?? '', thread ?? ''].join(' ')

export default definePlugin({
  name: 'inspector-helpers',
  description: "The inspector's helpers row: the sub-agents a thread has running",
  inject: { inspector, kit, jobs },
  apply(ctx) {
    const changes = pulse(ctx, [jobsChange, threadsChange, modelsChange], [threads, models])
    const modelOf = (model?: string) => model && (ctx.get(models)?.info(model)?.label ?? model)
    const threadOf = (session: string, { origin }: WireJob) => origin && ctx.get(threads)?.children(session).find(chat => chat.info.origin === origin)?.id

    const helpersOf = (session: string): Helper[] => {
      changes.version.get()
      return shownOf(ctx.jobs.list(session)).map(job => ({ job, model: modelOf(job.model), thread: threadOf(session, job) }))
    }

    const line = ({ job, model, thread }: Helper) => {
      const look = looks[job.status]
      return ctx.kit.cardItem(
        {
          lead: ctx.kit.dot(look.tone),
          end: [model && span({ class: 'mr-2' }, model), look.end ?? ctx.kit.elapsed(job.started)],
          ...(thread && { onClick: () => ctx.get(shell)?.open({ kind: threadRouteKind, id: thread }) }),
        },
        job.label,
      )
    }

    const render = (session: () => string) => {
      const helpers = derive(() => helpersOf(session()))
      const running = () => helpers.get().filter(({ job }) => job.status === 'running').length
      return div(
        { class: 'flex min-w-0 flex-col' },
        ctx.kit.cardCaption(() => `Helpers · ${running()} running`),
        list(helpers, keyOf, helper => line(helper.get()), div({ class: 'flex min-w-0 flex-col' })),
      )
    }

    ctx.effect(() =>
      ctx.inspector.row({
        id: 'helpers',
        group: 'helpers',
        order: 60,
        shows: subject => helpersOf(subject.session).length > 0,
        render: subject => render(() => subject().session),
      }),
    )
  },
})
