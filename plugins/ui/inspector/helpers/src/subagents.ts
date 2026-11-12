import { threadOwners } from '@sand/chat/contract'
import type { Wire } from '@sand/devices-contract'
import { pulse } from '@sand/reactive'
import { copyPathAction, threadRows } from '@sand/threads-home/contract'
import type { Kit, MenuSpec } from '@sand/ui-kit/contract'
import { type ChipSource, type Row, shell, type Subject } from '@sand/ui-shell/contract'
import { threadRouteKind, threadsChange, type Thread, type Threads, type Turns } from '@sand/web-client/contract'
import type { Context } from 'drydock'
import { finishedSubagents, type Listed } from './finished'
import { helperCard, stopAction } from './line'

interface SubagentParts {
  kit: Kit
  wire: Wire
  threads: Threads
  turns: Turns
}

const titleOf = (subagent: Thread) => subagent.info.title || 'Subagent'

const startOf = (subagent: Thread) => subagent.started ?? subagent.info.created

const keyOf = ({ subagent, final }: Listed) => [subagent.id, final, titleOf(subagent)].join(' ')

const placeIn = (owner: Subject['owner'], row: Row) => (owner === 'bot' ? row.place : undefined)

const captionOf = (running: number) => (running ? `Subagents · ${running} running` : 'Subagents')

export const subagentsOf = (ctx: Context, { kit, wire, threads, turns }: SubagentParts) => {
  const changes = pulse(ctx, [threadsChange], [threadOwners, threadRows])

  const starterOf = (subagent: Thread) => subagent.info.parent ?? ctx.get(threadOwners)?.owner(subagent.id)?.id

  const finishedIn = finishedSubagents(ctx, { wire, threads, starterOf })

  const runningIn = (owner: string) => {
    changes.version.get()
    return threads
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

  const menuOf = (subagent: Thread): MenuSpec => ({
    title: titleOf(subagent),
    actions: [
      copyPathAction(kit, subagent.info.cwd),
      { id: 'copy-id', group: 'copy', label: 'Copy ID', icon: 'copy', run: () => kit.copyText(subagent.id) },
      ...(subagent.running ? [stopAction(() => void turns.stop(subagent.id))] : []),
    ],
  })

  const render = (subject: () => Subject) =>
    helperCard(kit, {
      caption: () => captionOf(runningIn(subject().session).length),
      items: () => listedIn(subject()),
      key: keyOf,
      line: item => ({ row: () => listedRowOf(subject().owner, item), menu: () => menuOf(item.subagent), open: () => open(item.subagent) }),
    })

  const chip: ChipSource = {
    key: 'running',
    label: 'running',
    title: 'Running subagents',
    order: 30,
    status: 'running',
    items: ({ owner }) => runningIn(owner).map(subagent => ({ ...rowOf(subagent), open: () => open(subagent) })),
  }

  return { shows: (subject: Subject) => listedIn(subject).length > 0, render, chip }
}
