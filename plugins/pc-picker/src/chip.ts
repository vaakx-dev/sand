import { button, derive, div, dot, dynamicChild, icon, popover, show, sig, SPACE, span, type Pulse } from '@sand/dom'
import { pcMenu } from './menu'
import { refreshGroup } from './refresh'
import { machineIcon } from './rows'
import { currentTarget, hasMessages, type PickerContext } from './target'

const look =
  'inline-flex h-8 min-w-0 items-center gap-2 rounded-lg px-2 text-sm cursor-pointer transition-colors hover:bg-neutral-700 hover:text-neutral-200'

const above = {
  left: '0',
  bottom: '100%',
  width: `min(${SPACE['96']}, calc(100vw - ${SPACE['12']}))`,
  maxHeight: `calc(100vh - ${SPACE['32']})`,
}

const press = (action: () => void) => ({
  onMouseDown: (event: MouseEvent) => {
    event.stopPropagation()
    event.preventDefault()
    action()
  },
  onClick: (event: MouseEvent) => {
    if (event.detail === 0) action()
  },
})

export const createChip = (ctx: PickerContext, changes: Pulse) => {
  const open = sig(false)
  const close = () => open.set(false)
  const hidden = changes.read(() => ctx.machines.list().length < 2)
  const locked = changes.read(() => hasMessages(currentTarget(ctx).thread))
  const machine = changes.read(() => ctx.machines.get(currentTarget(ctx).device))
  const name = () => machine.get()?.name ?? 'This PC'

  const toggle = () => {
    if (open.get()) return close()
    refreshGroup(ctx, currentTarget(ctx).group)
    open.set(true)
  }

  const explain = () => ctx.notify?.push('A thread runs on one PC. Start a new thread to use another PC.')

  const lockedChip = () =>
    button(
      { type: 'button', title: () => `This thread runs on ${name()}`, class: [look, 'text-neutral-500'], ...press(explain) },
      icon('lock', 13),
      span({ class: 'min-w-0 truncate' }, name),
    )

  const openChip = () =>
    button(
      { type: 'button', title: 'Choose which PC runs this', class: [look, () => (open.get() ? 'bg-neutral-700 text-neutral-100' : 'text-neutral-400')], ...press(toggle) },
      dot(machine.get()?.online === false ? 'neutral' : 'success'),
      span({ class: 'min-w-0 truncate' }, name),
      span({ class: 'inline-flex shrink-0' }, icon('down', 12)),
    )

  const pill = () =>
    div(
      { class: 'relative flex min-w-0 items-center', hidden },
      dynamicChild(derive(() => `${locked.get()}:${machine.get()?.id}:${machine.get()?.online}`), () => (locked.get() ? lockedChip() : openChip())),
      show(derive(() => open.get() && !locked.get()), () =>
        popover(close, { class: 'mb-3 overflow-auto', style: above }, dynamicChild(changes.version, () => pcMenu(ctx, close))),
      ),
    )

  return { pill }
}
