import type { Pending, Prompt, Thread } from '@sand/protocol'
import { preview } from '@sand/conversation'
import { badge, color, derive, div, dynamicChild, errorMessage, icon, iconButton, img, list, quietButton, show, sig, span, type Sig } from '@sand/dom'
import type { Context } from 'drydock'
import { bannerPanel } from '../components/glass'
import type { Model } from '../model'

interface Row {
  item: Pending
  steer: boolean
}

const imageOf = (prompt: Prompt) => (typeof prompt === 'string' ? undefined : prompt.find(block => block.type === 'image'))

const thumbnail = (prompt: Prompt) => {
  const image = imageOf(prompt)
  return (image && preview(image)) || ''
}

const rowsOf = (thread?: Thread): Row[] =>
  thread ? [...thread.queued.map(item => ({ item, steer: true })), ...thread.followUps.map(item => ({ item, steer: false }))] : []

export const queueBanner = (ctx: Context<'threads' | 'turns'>, model: Model) => {
  const rows = model.changes.read(() => rowsOf(ctx.threads.current()))
  const open = sig(true)
  const dragged = sig<string | undefined>(undefined)
  const over = sig<string | undefined>(undefined)

  const act = (run: (thread: string) => Promise<unknown>) => {
    const thread = ctx.threads.current()
    if (thread) void run(thread.id).catch(error => model.fail(errorMessage(error)))
  }

  const drop = (targetId: string) => {
    const moving = dragged.get()
    dragged.set(undefined)
    over.set(undefined)
    const order = ctx.threads.current()?.followUps ?? []
    const index = order.findIndex(item => item.id === targetId)
    if (moving && moving !== targetId && index >= 0) act(thread => ctx.turns.move(thread, moving, index))
  }

  const row = (entry: Sig<Row>) => {
    const id = entry.get().item.id
    const item = () => entry.get().item
    const steer = derive(() => entry.get().steer)
    const queued = derive(() => !entry.get().steer)
    const hasImage = derive(() => Boolean(imageOf(item().prompt)))
    return div(
      {
        class: [
          'flex min-h-8 items-center gap-1 rounded-lg pr-1 text-sm text-neutral-200 hover:bg-neutral-700',
          () => (model.editing.get() === id ? 'bg-neutral-700' : ''),
        ],
        style: { boxShadow: () => (over.get() === id ? `inset 0 2px 0 ${color('accent', 400)}` : '') },
        draggable: queued,
        onDragStart: event => {
          dragged.set(id)
          event.dataTransfer?.setData('text/plain', id)
        },
        onDragOver: event => {
          if (!dragged.get() || steer.get()) return
          event.preventDefault()
          over.set(id)
        },
        onDragLeave: () => over.set(undefined),
        onDrop: event => {
          event.preventDefault()
          drop(id)
        },
        onDragEnd: () => {
          dragged.set(undefined)
          over.set(undefined)
        },
      },
      span(
        { class: 'inline-flex w-6 shrink-0 justify-center text-neutral-500', style: { cursor: () => (steer.get() ? '' : 'grab') }, title: () => (steer.get() ? '' : 'Drag to reorder') },
        dynamicChild(steer, value => span({ class: 'inline-flex' }, icon(value ? 'steer' : 'grip', 14))),
      ),
      show(hasImage, () => img({ class: 'h-4 w-4 shrink-0 rounded-sm', style: { objectFit: 'cover' }, src: () => preview(imageOf(item().prompt)!) ?? '', alt: '' })),
      span({ class: 'min-w-0 flex-1 truncate' }, () => item().label),
      show(steer, () => badge('neutral', 'next step')),
      show(queued, () => iconButton({ size: 'sm', title: 'Edit', onClick: () => model.edit(item()) }, icon('pencil', 13))),
      show(queued, () =>
        quietButton({ size: 'sm', onClick: () => act(thread => ctx.turns.promote(thread, item().id)) }, icon('promote', 13), () => (model.running.get() ? 'Steer' : 'Send now')),
      ),
      iconButton({ size: 'sm', title: 'Remove', onClick: () => act(thread => ctx.turns.withdraw(thread, item().id)) }, icon('x', 13)),
    )
  }

  return show(
    derive(() => rows.get().length > 0),
    () =>
      bannerPanel(
        'plain',
        div(
          { class: 'flex min-h-6 items-center gap-2 text-neutral-400' },
          icon('queued', 13),
          span({ class: 'font-medium text-neutral-200' }, 'Queued'),
          span(() => String(rows.get().length)),
          span({ class: 'flex-1' }),
          iconButton({ size: 'sm', title: () => (open.get() ? 'Collapse' : 'Expand'), onClick: () => open.set(!open.get()) }, dynamicChild(open, value => span({ class: 'inline-flex' }, icon(value ? 'down' : 'up', 14)))),
        ),
        show(open, () => list(rows, entry => entry.item.id, row, div({ class: 'mt-1 flex flex-col' }))),
      ),
  )
}
