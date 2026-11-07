import { isMetered } from '@sand/accounts/contract'
import type { PickerTarget } from '@sand/model-picker/contract'
import type { Pulse } from '@sand/reactive'
import { div, dynamicChild, show, sig, SPACE, span } from '@vaakx-dev/vrui'
import type { PanelContext } from './context'
import type { ShownState } from './shown'

const panelWidth = `min(calc(${SPACE['96']} + ${SPACE['12']}), 100%)`

export const modelPill = (ctx: PanelContext, target: PickerTarget, changes: Pulse, shownState: ShownState) => {
  const { chipButton, chipPopover, icon, modelLogo, pressOpens, shrinkBadge } = ctx.kit
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
  const metered = source.map(found => !!found && isMetered(found.billing))
  const pillTip = () => {
    if (!current.get()) return ''
    return [modelLabel(), offline() && 'offline', metered.get() && 'Pay per token', effortLabel() && `${effortLabel()} effort`, current.get()?.speed === 'fast' && 'Fast mode'].filter(Boolean).join(' · ')
  }

  const view = () =>
    div(
      { class: 'flex min-w-0 items-center gap-1', hidden: current.map(value => !value) },
      chipButton(
        { active: open, menu: true, warning: () => !chosen.get(), class: 'max-w-full', title: pillTip, ...pressOpens(open, toggle) },
        dynamicChild(
          model.map(value => value?.provider),
          provider => (provider ? modelLogo(provider, 14) : null),
        ),
        span({ class: 'min-w-0 truncate' }, modelLabel),
        show(
          current.map(value => Boolean(value?.effort)),
          () => span({ class: 'hidden shrink-0 sm:inline' }, () => `· ${effortLabel()}`),
        ),
        show(
          current.map(value => value?.speed === 'fast'),
          () => span({ class: 'inline-flex shrink-0' }, icon('zap', 'sm')),
        ),
        show(metered, () => span({ class: 'inline-flex shrink-0' }, icon('tag', 'sm'))),
      ),
      show(next.map(Boolean), () =>
        span(
          { class: 'inline-flex min-w-0', title: () => (next.get() ? `Switches to ${nextLabel()} when this turn finishes` : '') },
          shrinkBadge(
            'neutral',
            icon('clock', 12),
            span({ class: 'shrink-0' }, 'Next'),
            span({ class: 'hidden min-w-0 truncate sm:inline' }, () => (next.get() ? `: ${nextLabel()}` : '')),
          ),
        ),
      ),
      show(open, () =>
        chipPopover(close, { class: 'right-0', width: panelWidth }, ctx.modelPicker.panel(target, close, { flash })),
      ),
    )

  return { view, open: reveal }
}
