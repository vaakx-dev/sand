import { threadOwners } from '@sand/chat/contract'
import { inspector } from '@sand/inspector/contract'
import { pulse } from '@sand/reactive'
import { kit } from '@sand/ui-kit/contract'
import { threadRows } from '@sand/threads-home/contract'
import { type ChipSource, type Row, shell } from '@sand/ui-shell/contract'
import { threadRouteKind, threads, threadsChange, type Thread } from '@sand/web-client/contract'
import { derive, div, list } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'

const titleOf = (subagent: Thread) => subagent.info.title || 'Subagent'

const startOf = (subagent: Thread) => subagent.started ?? subagent.info.created

const keyOf = (subagent: Thread) => [subagent.id, titleOf(subagent)].join(' ')

export default definePlugin({
  name: 'inspector-helpers',
  description: 'The subagents working in a thread or bot chat: listed in its Details, and counted as running above its composer',
  inject: { inspector, kit, threads },
  apply(ctx) {
    const changes = pulse(ctx, [threadsChange], [threadOwners, threadRows])

    const startedBy = (owner: string, subagent: Thread) => subagent.info.parent === owner || ctx.get(threadOwners)?.owner(subagent.id)?.id === owner

    const runningIn = (owner: string) => {
      changes.version.get()
      return ctx.threads
        .list()
        .filter(subagent => subagent.info.kind === 'agent' && subagent.running && startedBy(owner, subagent))
        .toSorted((a, b) => b.info.created - a.info.created)
    }

    const open = (subagent: Thread) => ctx.get(shell)?.open({ kind: threadRouteKind, id: subagent.id })

    const rowOf = (subagent: Thread): Row => {
      changes.version.get()
      return ctx.get(threadRows)?.row(subagent.id) ?? { id: subagent.id, label: titleOf(subagent), status: 'running', at: startOf(subagent) }
    }

    const line = (subagent: Thread) => ctx.kit.workRow({ surface: 'raised', onClick: () => open(subagent) }, ctx.kit.rowBody(() => rowOf(subagent)))

    const render = (session: () => string) => {
      const running = derive(() => runningIn(session()))
      return div(
        { class: 'flex min-w-0 flex-col' },
        ctx.kit.cardCaption(() => `Subagents · ${running.get().length} running`),
        list(running, keyOf, subagent => line(subagent.get()), div({ class: 'flex min-w-0 flex-col' })),
      )
    }

    const chip: ChipSource = {
      key: 'running',
      label: 'running',
      title: 'Running subagents',
      order: 30,
      status: 'running',
      items: ({ owner }) => runningIn(owner).map(subagent => ({ ...rowOf(subagent), open: () => open(subagent) })),
    }

    ctx.effect(() =>
      ctx.inspector.row({
        id: 'helpers',
        group: 'helpers',
        order: 60,
        shows: subject => runningIn(subject.session).length > 0,
        render: subject => render(() => subject().session),
      }),
    )
    ctx.watch(shell, found => found?.chip(chip))
  },
})
