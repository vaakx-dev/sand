import { derive, div, dynamicChild, icon, modelLogo, onDocument, plainButton, popover, portal, pressOpens, show, sig, span, type StyleMap } from '@sand/dom'
import type { PickerTarget } from './contract'
import type { PickerKit } from './kit'
import { modelPanel } from './panel/panel'

const gap = 8
const panelHeight = 480
const panelWidth = 432

const placeNear = (rect: DOMRect): StyleMap => {
  const below = innerHeight - rect.bottom - gap * 2
  const above = rect.top - gap * 2
  const fit = Math.min(panelWidth, innerWidth - gap * 2)
  const width = `${fit}px`
  const right = `${Math.max(gap, Math.min(innerWidth - rect.right, innerWidth - fit - gap))}px`
  return below >= panelHeight || below >= above
    ? { position: 'fixed', top: `${rect.bottom + gap}px`, right, width, maxHeight: `${below}px` }
    : { position: 'fixed', bottom: `${innerHeight - rect.top + gap}px`, right, width, maxHeight: `${above}px` }
}

const closeOnScroll = (inner: HTMLElement, close: () => void) =>
  onDocument(
    inner,
    'scroll',
    ({ target }) => {
      if (target instanceof Node && inner.parentElement?.contains(target)) return
      close()
    },
    { capture: true, passive: true },
  )

export const pickerButton = (kit: PickerKit, target: PickerTarget, label: string) => {
  const open = sig(false)
  const close = () => open.set(false)
  let place: StyleMap = {}
  let anchor: HTMLElement | undefined

  const shown = kit.changes.read(() => target.shown())
  const model = derive(() => kit.ctx.models.info(shown.get()?.model))
  const text = () => {
    const effort = kit.ctx.models.levels().find(level => level.id === shown.get()?.effort)?.label
    return [model.get()?.label ?? shown.get()?.model ?? 'Choose a model', effort].filter(Boolean).join(' · ')
  }
  const toggle = () => {
    if (open.get()) return close()
    if (anchor) place = placeNear(anchor.getBoundingClientRect())
    open.set(true)
  }
  const panel = () =>
    popover(
      close,
      { class: 'overflow-auto', style: place },
      div({ class: 'flex flex-col', onMount: inner => closeOnScroll(inner, close) }, modelPanel(kit, target, close)),
    )

  return plainButton(
    {
      title: text,
      'aria-label': () => `${label}: ${text()}`,
      'aria-expanded': () => String(open.get()),
      class: [
        'flex h-8 max-w-full min-w-40 items-center gap-2 rounded-lg pr-2 pl-3 text-sm text-neutral-100 hover:bg-neutral-700',
        () => (open.get() ? 'bg-neutral-700' : 'bg-neutral-800'),
      ],
      ...pressOpens(toggle),
      onMount: node => {
        anchor = node
      },
    },
    dynamicChild(
      model.map(value => value?.provider),
      provider => span({ class: 'inline-flex shrink-0' }, modelLogo(provider, 14)),
    ),
    span({ class: 'min-w-0 flex-1 truncate text-left' }, text),
    show(
      shown.map(value => value?.speed === 'fast'),
      () => span({ class: 'inline-flex shrink-0 text-warning-400' }, icon('zap', 13)),
    ),
    span({ class: 'inline-flex shrink-0 text-neutral-500' }, icon('down', 14)),
    show(open, () => portal(document.body, panel())),
  )
}
