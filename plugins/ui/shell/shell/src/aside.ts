import { div, dynamicChild, list } from '@vaakx-dev/vrui'
import { bar } from './bar'
import { panelWidth, type Model } from './model'

export const asideToggles = (model: Model) => {
  const { icon, iconButton } = model.kit
  return list(
    model.shownAsides,
    spec => spec.id,
    spec => {
      const shown = () => model.asideShown(spec.get())
      return iconButton(
        {
          title: () => spec.get().label,
          'aria-label': () => spec.get().label,
          active: shown,
          'aria-expanded': () => String(shown()),
          onClick: () => model.showAside(spec.get().id, !shown()),
        },
        icon(spec.get().icon),
      )
    },
    div({ class: 'flex shrink-0 items-center gap-1' }),
  )
}

const beside = (model: Model) => () => model.beside.get()

export const asideCard = (model: Model) =>
  dynamicChild(model.openCard, spec =>
    spec
      ? div(
          { class: [model.kit.layer.sticky, 'pointer-events-none absolute inset-x-0 top-12 bottom-3 flex justify-end pr-3'] },
          div(
            { 'aria-label': spec.label, class: 'pointer-events-auto flex max-h-full flex-col self-start rounded-2xl bg-neutral-800 p-1.5 shadow-xl', style: { width: '18rem' } },
            spec.render(beside(model)),
          ),
        )
      : null,
  )

const docked = (model: Model, open: Model['openPanel'], look: { class: string; style?: Record<string, string> }) =>
  dynamicChild(open, spec =>
    spec ? div({ 'aria-label': spec.label, class: ['flex min-h-0 min-w-0 shrink-0 flex-col bg-neutral-950', look.class], style: look.style ?? null }, spec.render(beside(model))) : null,
  )

export const asidePanel = (model: Model) => docked(model, model.openPanel, { class: '', style: { width: `${panelWidth}px` } })

export const asideDrawer = (model: Model) => docked(model, model.openDrawer, { class: 'h-64' })

export const asideScreen = (model: Model, id: string) => {
  const { icon, iconButton, barTitle } = model.kit
  const spec = model.asides.items.get().find(found => found.id === id)
  return div(
    { 'aria-label': spec?.label ?? '', class: 'flex min-h-0 min-w-0 flex-1 flex-col bg-neutral-950' },
    bar(iconButton({ title: 'Back', 'aria-label': 'Back', onClick: () => model.back() }, icon('back')), barTitle(spec?.label ?? '')),
    spec ? spec.render(beside(model)) : null,
  )
}
