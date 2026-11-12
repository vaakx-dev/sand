import { div, dynamicChild, list, listen } from '@vaakx-dev/vrui'
import { bar } from './bar'
import type { Aside } from './contract'
import { panelWidth, type Model } from './model'

export const asideToggles = (model: Model) => {
  const { icon, iconButton } = model.kit
  return list(
    model.shownAsides,
    spec => spec.id,
    spec => {
      const shown = () => model.asideShown(spec.get())
      const button = iconButton(
        {
          title: () => spec.get().label,
          'aria-label': () => spec.get().label,
          active: shown,
          'aria-expanded': () => String(shown()),
          onClick: () => model.showAside(spec.get().id, !shown()),
        },
        icon(spec.get().icon),
      )
      if (spec.get().kind !== 'card') return button
      const anchor: HTMLElement = div({ class: 'relative flex' }, button, popover(model, () => anchor))
      return anchor
    },
    div({ class: 'flex shrink-0 items-center gap-1' }),
  )
}

const beside = (model: Model) => () => model.current.get()

const asideHead = (model: Model, spec: Aside) =>
  bar(
    div({ class: 'flex min-w-0 flex-1 items-center gap-2' }, spec.head ? spec.head(beside(model)) : model.kit.sheetTitle(spec.label)),
    model.kit.closeButton({ title: `Close ${spec.label}`, onClick: () => model.showAside(spec.id, false) }),
  )

const popover = (model: Model, anchor: () => HTMLElement) =>
  dynamicChild(model.openPop, spec => {
    if (!spec) return null
    listen(document, 'pointerdown', (event: PointerEvent) => {
      if (!anchor().contains(event.target as Node)) model.showAside(spec.id, false)
    })
    return div(
      {
        'aria-label': spec.label,
        class: [model.kit.layer.sticky, 'absolute top-full right-0 mt-1 flex flex-col overflow-auto rounded-2xl bg-neutral-800 p-1.5 shadow-xl'],
        style: () => ({ width: '18rem', maxHeight: `${Math.max(model.height.get() - 64, 160)}px` }),
      },
      spec.render(beside(model)),
    )
  })

export const asideCard = (model: Model) =>
  dynamicChild(model.openCard, spec =>
    spec
      ? div(
          { class: [model.kit.layer.sticky, 'pointer-events-none absolute inset-x-0 top-12 bottom-3 flex justify-end pr-3'] },
          div(
            { 'aria-label': spec.label, class: 'pointer-events-auto flex max-h-full flex-col self-start rounded-2xl bg-neutral-800 p-1.5 shadow-xl', style: { width: '18rem' } },
            asideHead(model, spec),
            spec.render(beside(model)),
          ),
        )
      : null,
  )

const docked = (model: Model, open: Model['openPanel'], look: { class: string; style?: Record<string, string> }) =>
  dynamicChild(open, spec =>
    spec
      ? div(
          { 'aria-label': spec.label, class: ['flex min-h-0 min-w-0 shrink-0 flex-col bg-neutral-950', look.class], style: look.style ?? null },
          asideHead(model, spec),
          spec.render(beside(model)),
        )
      : null,
  )

export const asidePanel = (model: Model) => docked(model, model.openPanel, { class: '', style: { width: `${panelWidth}px` } })

export const asideDrawer = (model: Model) => docked(model, model.openDrawer, { class: 'h-64' })

export const asideScreen = (model: Model, spec: Aside) =>
  div({ 'aria-label': spec.label, class: 'flex min-h-0 min-w-0 flex-1 flex-col bg-neutral-950' }, asideHead(model, spec), spec.render(beside(model)))
