import { threadOwners, threadView, type ThreadLive } from '@sand/chat/contract'
import { inspector } from '@sand/inspector/contract'
import { pulse } from '@sand/reactive'
import { kit } from '@sand/ui-kit/contract'
import type { Status } from '@sand/ui-shell/contract'
import { ago } from '@sand/util'
import { threads, threadsChange } from '@sand/web-client/contract'
import { derive, div, list, show, type Child } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'

type Group = 'Needs you' | 'Running' | 'Done'

const GROUPS: Group[] = ['Needs you', 'Running', 'Done']

const GROUP_OF: Record<Status, Group> = { waiting: 'Needs you', ready: 'Needs you', merging: 'Running', running: 'Running', merged: 'Done', done: 'Done' }

const SHOWN: Record<Group, number> = { 'Needs you': Infinity, Running: Infinity, Done: 5 }

const newestFirst = (a: ThreadLive, b: ThreadLive) => b.at - a.at

const keyOf = (live: ThreadLive) => [live.id, live.status].join(' ')

export default definePlugin({
  name: 'inspector-threads',
  description: "The inspector's threads row: the threads a bot started, grouped by what they need",
  inject: { inspector, kit, threads, threadView, threadOwners },
  apply(ctx) {
    const changes = pulse(ctx, [threadsChange])

    const startedBy = (owner: string) => {
      changes.version.get()
      return ctx.threads
        .list()
        .filter(thread => thread.info.kind !== 'agent' && ctx.threadOwners.owner(thread.id)?.id === owner)
        .flatMap(thread => ctx.threadView.live(thread.id) ?? [])
        .toSorted(newestFirst)
    }

    const inGroup = (all: ThreadLive[], group: Group) => all.filter(live => GROUP_OF[live.status] === group)

    const endOf = (live: ThreadLive): Child => {
      switch (GROUP_OF[live.status]) {
        case 'Needs you':
          return live.note
        case 'Running':
          return ctx.kit.elapsed(live.at)
        case 'Done':
          return ago(live.at)
      }
    }

    const line = (live: ThreadLive) =>
      ctx.kit.cardItem({ lead: ctx.kit.statusIcon(live.status), end: endOf(live), title: live.title, onClick: () => ctx.threadView.open(live.id) }, live.title)

    const section = (members: () => ThreadLive[], group: Group) =>
      show(
        () => members().length > 0,
        () =>
          div(
            { class: 'flex min-w-0 flex-col' },
            ctx.kit.cardCaption(() => `${group} · ${members().length}`),
            list(
              derive(() => members().slice(0, SHOWN[group])),
              keyOf,
              live => line(live.get()),
              div({ class: 'flex min-w-0 flex-col' }),
            ),
          ),
      )

    const render = (owner: () => string) => {
      const all = derive(() => startedBy(owner()))
      return div({ class: 'flex min-w-0 flex-col' }, ...GROUPS.map(group => section(() => inGroup(all.get(), group), group)))
    }

    ctx.effect(() =>
      ctx.inspector.row({
        id: 'threads',
        group: 'threads',
        order: 55,
        shows: subject => startedBy(subject.session).length > 0,
        render: subject => render(() => subject().session),
      }),
    )
  },
})
