import { contextMenu, derive, div, dynamicChild, event, plainButton, popover, show, sig, SPACE, span, type Pulse } from '@sand/dom'
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
    plainButton(
      {
        title,
        class: [
          'inline-flex h-6 min-w-0 items-center gap-1 rounded-md px-2 text-xs transition-colors hover:bg-neutral-800 hover:text-neutral-200',
          () => (open.get() ? 'bg-neutral-800 text-neutral-100' : 'text-neutral-500'),
        ],
        onMouseDown: event(toggle, { stop: true, prevent: true }),
        onClick: (click: MouseEvent) => {
          if (click.detail === 0) toggle()
        },
      },
      span({ class: 'inline-flex shrink-0' }, machineIcon(machine.get(), 12)),
      span({ class: 'min-w-0 truncate py-1 text-middle' }, name),
      machine.get()?.online === false ? span({ class: 'shrink-0 text-neutral-600 text-middle' }, '· Offline') : null,
    )

  const pill = () =>
    div(
      { class: 'flex min-w-0 items-center', hidden },
      context.view(),
      dynamicChild(derive(() => `${machine.get()?.id}:${machine.get()?.online}`), chip),
      show(open, () =>
        popover(
          close,
          { class: 'bottom-full left-0 mb-3 w-96 max-w-full overflow-auto', style: { maxHeight: `calc(100vh - ${SPACE['32']})` } },
          dynamicChild(changes.version, menu),
        ),
      ),
    )

  return { pill }
}
