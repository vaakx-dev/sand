import { button, div, dynamicChild, icon, popover, show, sig, SPACE, span, type Pulse, type Sig } from '@sand/dom'
import type { Actions, PanelContext } from './actions'
import { modelPanel } from './panel/panel'
import { logo, sourceName } from './panel/source'
import type { PcStatus } from './pcs'
import { toggles } from './toggle'

const pillLook =
  'inline-flex h-8 min-w-0 items-center gap-2 rounded-lg px-2 text-sm cursor-pointer transition-colors hover:bg-neutral-700 hover:text-neutral-200'

const above = {
  left: '0',
  bottom: '100%',
  width: `min(calc(${SPACE['96']} + ${SPACE['12']}), calc(100vw - ${SPACE['12']}))`,
  maxHeight: `calc(100vh - ${SPACE['32']})`,
}

export const createPicker = (ctx: PanelContext, actions: Actions, changes: Pulse, problem: Sig<string>, pcs: PcStatus) => {
  const open = sig(false)
  const flash = sig(false)
  const close = () => open.set(false)
  const reveal = (effort: boolean) => {
    flash.set(effort)
    open.set(true)
    pcs.refresh()
  }
  const toggle = () => (open.get() ? close() : reveal(false))

  const current = changes.read(() => ctx.models.state()?.current)
  const next = changes.read(() => ctx.models.state()?.next)
  const model = changes.read(() => ctx.models.info(ctx.models.state()?.current.model))
  const source = changes.read(() => ctx.models.sources().find(known => known.id === model.get()?.source))
  const modelLabel = () => model.get()?.label ?? current.get()?.model ?? ''
  const effortLabel = () => ctx.models.levels().find(level => level.id === current.get()?.effort)?.label ?? ''
  const sourceTip = () => {
    const known = source.get()
    if (!known) return ''
    return known.via && pcs.online(known.via) === false ? `${sourceName(known)} · offline` : sourceName(known)
  }
  const pillTip = () =>
    current.get() ? [modelLabel(), sourceTip(), effortLabel() && `${effortLabel()} effort`, current.get()?.speed === 'fast' && 'Fast mode'].filter(Boolean).join(' · ') : ''

  const pill = () =>
    div(
      { class: 'relative flex min-w-0 items-center gap-1', hidden: current.map(value => !value) },
      button(
        {
          type: 'button',
          title: pillTip,
          class: [pillLook, () => (open.get() ? 'bg-neutral-700 text-neutral-100' : 'text-neutral-400')],
          ...toggles(toggle),
        },
        dynamicChild(
          model.map(value => value?.provider),
          provider => logo(provider),
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
      show(
        next.map(Boolean),
        () =>
          span(
            { class: 'inline-flex h-6 min-w-0 items-center gap-1 rounded-md bg-warning-950 px-2 text-xs text-warning-400', title: () => (next.get() ? `Switches to ${ctx.models.label(next.get()!)} when this turn finishes` : '') },
            icon('clock', 12),
            span({ class: 'shrink-0' }, 'Next'),
            span({ class: 'hidden truncate sm:inline' }, () => (next.get() ? `: ${ctx.models.label(next.get()!)}` : '')),
          ),
      ),
      show(open, () => popover(close, { class: 'mb-3 overflow-auto', style: above }, modelPanel(ctx, actions, { changes, flash, problem, pcs, close }))),
    )

  return {
    pill,
    open: (effort = false) => reveal(effort),
  }
}
