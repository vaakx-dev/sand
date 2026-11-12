import { threadOwners } from '@sand/chat/contract'
import { wire } from '@sand/devices-contract'
import { inspector } from '@sand/inspector/contract'
import { pulse } from '@sand/reactive'
import { kit } from '@sand/ui-kit/contract'
import { threadRows } from '@sand/threads-home/contract'
import { type ChipSource, type Row, shell, type Subject } from '@sand/ui-shell/contract'
import { threadRouteKind, threads, threadsChange, type Thread } from '@sand/web-client/contract'
import { derive, div, list } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { finishedSubagents, type Listed } from './finished'

const titleOf = (subagent: Thread) => subagent.info.title || 'Subagent'

const startOf = (subagent: Thread) => subagent.started ?? subagent.info.created

const keyOf = ({ subagent, final }: Listed) => [subagent.id, final, titleOf(subagent)].join(' ')

const placeIn = (owner: Subject['owner'], row: Row) => (owner === 'bot' ? row.place : undefined)

const captionOf = (running: number) => (running ? `Subagents · ${running} running` : 'Subagents')

export default definePlugin({
  name: 'inspector-helpers',
  description: 'The subagents of a thread or bot chat: listed in its Details with the last few finished ones, and counted as running above its composer',
  inject: { inspector, kit, threads, wire },
  apply(ctx) {
    const changes = pulse(ctx, [threadsChange], [threadOwners, threadRows])

    const starterOf = (subagent: Thread) => subagent.info.parent ?? ctx.get(threadOwners)?.owner(subagent.id)?.id

    const finishedIn = finishedSubagents(ctx, { wire: ctx.wire, threads: ctx.threads, starterOf })

    const runningIn = (owner: string) => {
      changes.version.get()
      return ctx.threads
        .list()
        .filter(subagent => subagent.info.kind === 'agent' && subagent.running && starterOf(subagent) === owner)
        .toSorted((a, b) => b.info.created - a.info.created)
    }

    const listedIn = (subject: Subject): Listed[] => [...runningIn(subject.session).map(subagent => ({ subagent })), ...finishedIn(subject)]

    const open = (subagent: Thread) => ctx.get(shell)?.open({ kind: threadRouteKind, id: subagent.id })

    const rowOf = (subagent: Thread): Row => {
      changes.version.get()
      return ctx.get(threadRows)?.row(subagent.id) ?? { id: subagent.id, label: titleOf(subagent), status: 'running', at: startOf(subagent) }
    }

    const listedRowOf = (owner: Subject['owner'], { subagent, final }: Listed): Row => {
      const row = rowOf(subagent)
      return { ...row, place: placeIn(owner, row), status: final ?? row.status }
    }

    const render = (subject: () => Subject) => {
      const line = (item: Listed) =>
        ctx.kit.workRow({ surface: 'raised', onClick: () => open(item.subagent) }, ctx.kit.rowBody(() => listedRowOf(subject().owner, item), { form: 'line' }))
      const listed = derive(() => listedIn(subject()))
      return div(
        { class: 'flex min-w-0 flex-col' },
        ctx.kit.cardCaption(() => captionOf(runningIn(subject().session).length)),
        list(listed, keyOf, item => line(item.get()), div({ class: 'flex min-w-0 flex-col' })),
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
        shows: subject => !subject.draft && listedIn(subject).length > 0,
        render,
      }),
    )
    ctx.watch(shell, found => found?.chip(chip))
  },
})
