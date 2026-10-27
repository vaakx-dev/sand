import { derive, div, dynamicChild, onDocument, onWindow, portal, show, sig, span, type StyleMap } from '@vaakx-dev/vrui'
import type { PickerTarget } from './contract'
import type { Picker } from './deps'
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

export const pickerButton = (picker: Picker, target: PickerTarget, label: string) => {
  const { ctx, changes } = picker
  const { actionTones, controlButton, icon, modelLogo, popover, pressOpens } = ctx.kit
  const open = sig(false)
  const close = () => open.set(false)
  const place = sig<StyleMap>({})
  let anchor: HTMLElement | undefined
  const placePanel = () => {
    if (anchor) place.set(placeNear(anchor.getBoundingClientRect()))
  }

  const shown = changes.read(() => target.shown())
  const model = derive(() => ctx.models.info(shown.get()?.model))
  const text = () => {
    const effort = ctx.models.levels().find(level => level.id === shown.get()?.effort)?.label
    return [model.get()?.label ?? shown.get()?.model ?? 'Choose a model', effort].filter(Boolean).join(' · ')
  }
  const toggle = () => {
    if (open.get()) return close()
    placePanel()
    open.set(true)
  }
  const panel = () =>
    popover(
      close,
      { class: 'overflow-auto', style: place },
      div(
        {
          class: 'flex flex-col',
          onMount: inner => {
            closeOnScroll(inner, close)
            onWindow(inner, 'resize', placePanel)
          },
        },
        modelPanel(picker, target, close),
      ),
    )

  return controlButton(
    actionTones.secondary,
    {
      'aria-label': () => `${label}: ${text()}`,
      class: ['max-w-full min-w-40 justify-start pr-2', () => (open.get() ? 'bg-neutral-700' : '')],
      ...pressOpens(open, toggle),
      onMount: node => {
        anchor = node
      },
    },
    dynamicChild(
      model.map(value => value?.provider),
      provider => (provider ? modelLogo(provider, 16) : null),
    ),
    span({ class: 'min-w-0 flex-1 truncate text-left' }, text),
    show(
      shown.map(value => value?.speed === 'fast'),
      () => span({ class: 'inline-flex shrink-0 text-neutral-400', title: 'Fast mode' }, icon('zap', 'sm')),
    ),
    span({ class: 'inline-flex shrink-0 text-neutral-400' }, icon('down', 'sm')),
    show(open, () => portal(document.body, panel())),
  )
}
