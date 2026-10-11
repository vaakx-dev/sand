import { chipButton, chipPopover, contextMenu, derive, div, dynamicChild, pressOpens, show, sig, span, type Pulse } from '@sand/dom'
import type { ContinueContext } from './continue/flow'
import { continueMenu } from './continue/menu'
import { pcMenu } from './menu'
import { refreshGroup } from './refresh'
import { machineIcon } from './rows'
import { currentTarget, hasMessages, type PickerContext } from './target'

export const createChip = (ctx: PickerContext & ContinueContext, changes: Pulse) => {
  const open = sig(false)
  const close = () => open.set(false)
  const hidden = changes.read(() => ctx.machines.list().length < 2)
  const started = changes.read(() => hasMessages(currentTarget(ctx).thread))
  const machine = changes.read(() => ctx.machines.get(currentTarget(ctx).device))
  const name = () => machine.get()?.name ?? 'This PC'

  const toggle = () => {
    if (open.get()) return close()
    if (!started.get()) refreshGroup(ctx, currentTarget(ctx).group)
    open.set(true)
  }

  const context = contextMenu()

  const menu = () => {
    const { thread } = currentTarget(ctx)
    return thread && hasMessages(thread) ? continueMenu(ctx, thread, close) : pcMenu(ctx, close, context)
  }

  const title = () => (started.get() ? `This thread runs on ${name()}. Continue it on another PC` : 'Choose which PC runs this')

  const chip = () =>
    chipButton(
      { title, active: open, ...pressOpens(open, toggle) },
      span({ class: 'inline-flex shrink-0' }, machineIcon(machine.get(), 12)),
      span({ class: 'min-w-0 truncate py-1 text-box-trim' }, name),
      machine.get()?.online === false ? span({ class: 'shrink-0 text-neutral-600 text-box-trim' }, '· Offline') : null,
    )

  const pill = () =>
    div(
      { class: 'flex min-w-0 items-center' },
      context.view(),
      dynamicChild(derive(() => `${machine.get()?.id}:${machine.get()?.online}`), chip),
      show(open, () =>
        chipPopover(close, { class: 'left-0 w-96' }, dynamicChild(changes.version, menu)),
      ),
    )

  return { pill, hidden }
}
