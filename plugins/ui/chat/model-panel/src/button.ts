import type { PickerTarget } from '@sand/model-picker/contract'
import type { Pulse } from '@sand/reactive'
import { div, show, sig, SPACE, span } from '@vaakx-dev/vrui'
import type { PanelContext } from './context'
import type { ShownState } from './shown'

const panelWidth = `min(calc(${SPACE['96']} + ${SPACE['12']}), 100%)`

export const modelButton = (ctx: PanelContext, target: PickerTarget, changes: Pulse, shownState: ShownState) => {
  const { chipPopover, icon, pressOpens, quietButton } = ctx.kit
  const open = sig(false)
  let flash = false
  const close = () => open.set(false)
  const reveal = (effort = false) => {
    flash = effort
    open.set(true)
  }
  const toggle = () => (open.get() ? close() : reveal(false))

  const current = changes.read(() => shownState()?.current)
  const next = changes.read(() => shownState()?.next)
  const model = changes.read(() => ctx.models.info(shownState()?.current.model))
  const source = changes.read(() => ctx.models.sources().find(known => known.id === model.get()?.source))
  const chosen = current.map(value => Boolean(value?.model))
  const modelLabel = () => model.get()?.label ?? current.get()?.model ?? 'Choose a model'
  const effortLabel = () => ctx.models.levels().find(level => level.id === current.get()?.effort)?.label ?? ''
  const nextLabel = () => {
    const value = next.get()
    return value ? ctx.models.label(value) : ''
  }
  const offline = () => {
    const pc = source.get()?.pc
    return pc ? ctx.modelPicker.online(pc) === false : false
  }
  const tip = () => {
    if (!current.get()) return ''
    return [modelLabel(), offline() && 'offline', effortLabel() && `${effortLabel()} effort`, current.get()?.speed === 'fast' && 'Fast mode'].filter(Boolean).join(' · ')
  }

  const view = () =>
    div(
      { class: 'flex min-w-0 items-center gap-1', hidden: current.map(value => !value) },
      quietButton(
        { surface: 'raised', active: open, title: tip, class: 'min-w-0 shrink gap-1 px-2', ...pressOpens(open, toggle) },
        span({ class: ['min-w-0 truncate font-medium', () => (chosen.get() ? 'text-neutral-100' : 'text-warning-400')] }, modelLabel),
        show(
          current.map(value => Boolean(value?.effort)),
          () => span({ class: 'hidden shrink-0 sm:inline' }, effortLabel),
        ),
        show(
          current.map(value => value?.speed === 'fast'),
          () => span({ class: 'inline-flex shrink-0' }, icon('zap', 'sm')),
        ),
        span({ class: 'inline-flex shrink-0 text-neutral-500' }, icon('down', 'sm')),
      ),
      show(next.map(Boolean), () =>
        span(
          { class: 'hidden shrink-0 items-center gap-1 text-xs text-neutral-500 sm:flex', title: () => (next.get() ? `Switches to ${nextLabel()} when this turn finishes` : '') },
          icon('clock', 12),
          () => `Next: ${nextLabel()}`,
        ),
      ),
      show(open, () =>
        chipPopover(close, { class: 'right-0', width: panelWidth }, ctx.modelPicker.panel(target, close, { flash })),
      ),
    )

  return { view, open: reveal }
}
