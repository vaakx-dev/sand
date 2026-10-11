import type { PickerTarget } from '@sand/model-picker/contract'
import { button, chipPopover, div, dynamicChild, icon, modelLogo, pressOpens, show, sig, SPACE, span, type Pulse } from '@sand/dom'
import { sourceName } from '@sand/kit'
import type { PanelContext } from './actions'

const panelWidth = `min(calc(${SPACE['96']} + ${SPACE['12']}), 100%)`

export const modelPill = (ctx: PanelContext, target: PickerTarget, changes: Pulse) => {
  const open = sig(false)
  let flash = false
  const close = () => open.set(false)
  const reveal = (effort: boolean) => {
    flash = effort
    open.set(true)
  }
  const toggle = () => (open.get() ? close() : reveal(false))

  const current = changes.read(() => ctx.models.state()?.current)
  const next = changes.read(() => ctx.models.state()?.next)
  const model = changes.read(() => ctx.models.info(ctx.models.state()?.current.model))
  const source = changes.read(() => ctx.models.sources().find(known => known.id === model.get()?.source))
  const modelLabel = () => model.get()?.label ?? current.get()?.model ?? ''
  const effortLabel = () => ctx.models.levels().find(level => level.id === current.get()?.effort)?.label ?? ''
  const nextLabel = () => {
    const value = next.get()
    return value ? ctx.models.label(value) : ''
  }
  const sourceTip = () => {
    const known = source.get()
    if (!known) return ''
    return known.via && ctx.modelPicker.online(known.via) === false ? `${sourceName(known)} · offline` : sourceName(known)
  }
  const pillTip = () => {
    if (!current.get()) return ''
    return [modelLabel(), sourceTip(), effortLabel() && `${effortLabel()} effort`, current.get()?.speed === 'fast' && 'Fast mode'].filter(Boolean).join(' · ')
  }

  const view = () =>
    div(
      { class: 'flex min-w-0 items-center gap-1', hidden: current.map(value => !value) },
      button(
        {
          type: 'button',
          title: pillTip,
          class: [
            'inline-flex h-8 min-w-0 items-center gap-2 rounded-lg px-2 text-sm cursor-pointer transition-colors hover:bg-neutral-700 hover:text-neutral-200',
            () => (open.get() ? 'bg-neutral-700 text-neutral-100' : 'text-neutral-400'),
          ],
          ...pressOpens(open, toggle),
        },
        dynamicChild(
          model.map(value => value?.provider),
          provider => modelLogo(provider),
        ),
        span({ class: 'min-w-0 truncate' }, modelLabel),
        show(source.map(Boolean), () => span({ class: 'hidden min-w-0 truncate text-neutral-500 sm:inline' }, () => `· ${source.get()?.label ?? ''}`)),
        show(
          current.map(value => Boolean(value?.effort)),
          () => span({ class: 'hidden shrink-0 text-neutral-500 sm:inline' }, () => `· ${effortLabel()}`),
        ),
        show(
          current.map(value => value?.speed === 'fast'),
          () => span({ class: 'inline-flex shrink-0 text-warning-400' }, icon('zap', 13)),
        ),
        span({ class: 'hidden shrink-0 sm:inline-flex' }, icon('down', 12)),
      ),
      show(next.map(Boolean), () =>
        span(
          {
            class: 'inline-flex h-6 min-w-0 items-center gap-1 rounded-md bg-warning-950 px-2 text-xs text-warning-400',
            title: () => (next.get() ? `Switches to ${nextLabel()} when this turn finishes` : ''),
          },
          icon('clock', 12),
          span({ class: 'shrink-0' }, 'Next'),
          span({ class: 'hidden truncate sm:inline' }, () => (next.get() ? `: ${nextLabel()}` : '')),
        ),
      ),
      show(open, () =>
        chipPopover(close, { class: 'right-0', width: panelWidth }, ctx.modelPicker.panel(target, close, { flash })),
      ),
    )

  return { view, open: reveal }
}
