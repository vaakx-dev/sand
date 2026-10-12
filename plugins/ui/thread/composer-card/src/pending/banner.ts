import type { Thread } from '@sand/web-client/contract'
import { errorMessage } from '@sand/kit'
import type { Kit } from '@sand/ui-kit/contract'
import { div, list, show, sig, span, untrack, type Sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { bannerPanel } from '../dock/glass'
import type { Model } from '../model'
import { pendingMenu, type Act, type Row } from './menu'
import { imageOf, pendingThumb } from './thumb'

type Ctx = Context<'threads' | 'turns' | 'kit'>

const rowsOf = (thread?: Thread): Row[] =>
  thread ? [...thread.queued.map(item => ({ item, steer: true })), ...thread.followUps.map(item => ({ item, steer: false }))] : []

const header = ({ chevron, icon, iconButton }: Kit, count: () => number, open: Sig<boolean>) =>
  div(
    { class: 'flex min-h-6 items-center gap-2 text-neutral-400' },
    icon('steer', 14),
    span({ class: 'font-medium text-neutral-200' }, 'Up next'),
    span(() => String(count())),
    span({ class: 'flex-1' }),
    iconButton(
      { size: 'sm', title: () => (open.get() ? 'Collapse' : 'Expand'), 'aria-expanded': () => String(open.get()), onClick: open.toggle() },
      chevron(() => open.get(), 14),
    ),
  )

export const pendingBanner = (ctx: Ctx, model: Model) => {
  const { closeButton, contextMenu, icon } = ctx.kit
  const rows = model.changes.read(() => rowsOf(ctx.threads.current()))
  const open = sig(true)
  const menu = contextMenu()

  const act: Act = run => {
    const thread = ctx.threads.current()
    if (thread) void run(thread.id).catch(error => model.fail(errorMessage(error)))
  }

  const row = (entry: Sig<Row>) => {
    const { steer } = untrack(() => entry.get())
    return div(
      { class: 'flex min-h-8 items-center gap-1 rounded-lg pl-2 pr-1 text-sm text-neutral-200 hover:bg-neutral-700', ...menu.target(() => pendingMenu(ctx, act, entry.get())) },
      span({ class: 'inline-flex shrink-0 text-neutral-500', title: steer ? 'Joins the running turn' : 'Starts after this turn' }, icon(steer ? 'steer' : 'clock', 14)),
      show(() => Boolean(imageOf(entry.get().item.prompt)), () => pendingThumb(ctx, entry.get().item.prompt)),
      span({ class: 'min-w-0 flex-1 truncate' }, () => entry.get().item.label),
      closeButton({ title: 'Remove', size: 'sm', onClick: () => act(thread => ctx.turns.withdraw(thread, entry.get().item.id)) }),
    )
  }

  return show(
    () => rows.get().length > 0,
    () =>
      bannerPanel(
        'plain',
        header(ctx.kit, () => rows.get().length, open),
        show(open, () => list(rows, entry => entry.item.id, row, div({ class: 'mt-1 flex flex-col' }))),
        menu.view(),
      ),
  )
}
