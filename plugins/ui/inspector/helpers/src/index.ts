import { threadOwners } from '@sand/chat/contract'
import { inspector } from '@sand/inspector/contract'
import { pulse } from '@sand/reactive'
import { kit, type Tone } from '@sand/ui-kit/contract'
import { shell } from '@sand/ui-shell/contract'
import { threadRouteKind, threads, threadsChange, type Thread } from '@sand/web-client/contract'
import { derive, div, list } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'

type Status = 'running' | 'new' | 'done' | 'failed' | 'stopped'

const looks: Record<Status, Tone> = { running: 'run', new: 'accent', done: 'success', failed: 'danger', stopped: 'neutral' }

const statusOf = ({ running, ended, info }: Thread): Status => {
  if (running) return 'running'
  if (ended?.stopReason === 'error') return 'failed'
  if (ended?.stopReason === 'interrupted') return 'stopped'
  return info.seen ? 'done' : 'new'
}

const keyOf = (child: Thread) => [child.id, statusOf(child), child.info.title].join(' ')

export default definePlugin({
  name: 'inspector-helpers',
  description: "The inspector's subagents row: the subagents a thread or bot started",
  inject: { inspector, kit, threads },
  apply(ctx) {
    const changes = pulse(ctx, [threadsChange], [threadOwners])

    const startedBy = (owner: string, child: Thread) => child.info.parent === owner || ctx.get(threadOwners)?.owner(child.id)?.id === owner

    const helpersOf = (owner: string) => {
      changes.version.get()
      return ctx.threads
        .list()
        .filter(child => child.info.kind === 'agent' && startedBy(owner, child))
        .toSorted((a, b) => b.info.created - a.info.created)
    }

    const line = (child: Thread) => {
      const status = statusOf(child)
      return ctx.kit.cardItem(
        {
          lead: ctx.kit.dot(looks[status]),
          end: status === 'running' ? ctx.kit.elapsed(child.started ?? child.info.created) : status,
          onClick: () => ctx.get(shell)?.open({ kind: threadRouteKind, id: child.id }),
        },
        child.info.title || 'Subagent',
      )
    }

    const render = (session: () => string) => {
      const helpers = derive(() => helpersOf(session()))
      const running = () => helpers.get().filter(child => child.running).length
      return div(
        { class: 'flex min-w-0 flex-col' },
        ctx.kit.cardCaption(() => `Subagents · ${running()} running`),
        list(helpers, keyOf, child => line(child.get()), div({ class: 'flex min-w-0 flex-col' })),
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
