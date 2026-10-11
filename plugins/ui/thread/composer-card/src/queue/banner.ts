import type { Pending } from '@sand/steering/contract'
import type { Thread } from '@sand/web-client/contract'
import { badge, contextMenu, derive, div, dynamicChild, errorMessage, icon, iconButton, list, quietButton, reorder, show, sig, span, type Sig } from '@sand/dom'
import type { Context } from 'drydock'
import { bannerPanel } from '../dock/glass'
import type { Model } from '../model'
import { queueMenu, type Act } from './menu'
import { imageOf, queueThumb } from './thumb'

type Ctx = Context<'threads' | 'turns'>

interface Row {
  item: Pending
  steer: boolean
}

const groupOf = (row: Row) => (row.steer ? 'steer' : 'queued')

const rowsOf = (thread?: Thread): Row[] =>
  thread ? [...thread.queued.map(item => ({ item, steer: true })), ...thread.followUps.map(item => ({ item, steer: false }))] : []

const dragHandle = (steer: Sig<boolean>) =>
  span(
    { class: ['inline-flex w-6 shrink-0 justify-center text-neutral-500', { 'cursor-grab': steer.map(value => !value) }], title: () => (steer.get() ? '' : 'Drag to reorder') },
    dynamicChild(steer, value => span({ class: 'inline-flex' }, icon(value ? 'steer' : 'grip', 14))),
  )

const header = (count: () => number, open: Sig<boolean>) =>
  div(
    { class: 'flex min-h-6 items-center gap-2 text-neutral-400' },
    icon('queued', 13),
    span({ class: 'font-medium text-neutral-200' }, 'Queued'),
    span(() => String(count())),
    span({ class: 'flex-1' }),
    iconButton({ size: 'sm', title: () => (open.get() ? 'Collapse' : 'Expand'), onClick: open.toggle() }, dynamicChild(open, value => span({ class: 'inline-flex' }, icon(value ? 'down' : 'up', 14)))),
  )

export const queueBanner = (ctx: Ctx, model: Model) => {
  const rows = model.changes.read(() => rowsOf(ctx.threads.current()))
  const open = sig(true)
  const menu = contextMenu()

  const act: Act = run => {
    const thread = ctx.threads.current()
    if (thread) void run(thread.id).catch(error => model.fail(errorMessage(error)))
  }

  const idsIn = (group: string) => rows.get().flatMap(row => (groupOf(row) === group ? [row.item.id] : []))

  const drag = reorder({
    axis: 'y',
    siblings: idsIn,
    move(group, id, above) {
      const rest = idsIn(group).filter(other => other !== id)
      act(thread => ctx.turns.move(thread, id, above ? rest.indexOf(above) + 1 : 0))
    },
  })

  const row = (entry: Sig<Row>) => {
    const item = () => entry.get().item
    const steer = derive(() => entry.get().steer)
    const queued = derive(() => !steer.get())
    return div(
      {
        class: ['flex min-h-8 items-center gap-1 rounded-lg pr-1 text-sm text-neutral-200 hover:bg-neutral-700', () => (model.editing.get() === item().id ? 'bg-neutral-700' : '')],
        ...menu.target(() => queueMenu(ctx, model, act, item(), steer.get())),
        ...drag(() => ({ id: item().id, group: groupOf(entry.get()), movable: queued.get() })),
        draggable: queued,
      },
      dragHandle(steer),
      show(() => Boolean(imageOf(item().prompt)), () => queueThumb(ctx, item().prompt)),
      span({ class: 'min-w-0 flex-1 truncate' }, () => item().label),
      show(steer, () => badge('neutral', 'Next step')),
      show(queued, () => iconButton({ size: 'sm', title: 'Edit', onClick: () => model.edit(item()) }, icon('pencil', 13))),
      show(queued, () => quietButton({ size: 'sm', onClick: () => act(thread => ctx.turns.promote(thread, item().id)) }, icon('promote', 13), () => (model.running.get() ? 'Steer' : 'Send now'))),
      iconButton({ size: 'sm', title: 'Remove', onClick: () => act(thread => ctx.turns.withdraw(thread, item().id)) }, icon('x', 13)),
    )
  }

  return show(
    () => rows.get().length > 0,
    () =>
      bannerPanel(
        'plain',
        header(() => rows.get().length, open),
        show(open, () => list(rows, entry => entry.item.id, row, div({ class: 'mt-1 flex flex-col' }))),
        menu.view(),
      ),
  )
}
