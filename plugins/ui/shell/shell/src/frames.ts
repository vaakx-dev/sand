import { div, section, show } from '@vaakx-dev/vrui'
import { bar } from './bar'
import type { Model } from './model'
import { asideCard, asideDrawer, asidePanel, asideToggles } from './aside'
import type { Built } from './screens'

const fill = 'flex min-h-0 min-w-0 flex-1 flex-col'

const sidebarButton = ({ kit, setDrawer }: Model) =>
  kit.iconButton({ title: 'Show the sidebar', 'aria-label': 'Show the sidebar', onClick: () => setDrawer(true) }, kit.icon('sidebar'))

const backOf = (model: Model, built: Built | undefined) => () => built?.back?.() ?? (built?.nav && model.state.get() === 'phone' ? () => model.back() : undefined)

const backButton = (model: Model, built: Built | undefined) => {
  const back = backOf(model, built)
  return show(
    () => Boolean(back()),
    () => model.kit.backButton({ onClick: () => back()?.() }),
  )
}

const leadButton = (model: Model, built: Built | undefined) => {
  const back = backOf(model, built)
  return [backButton(model, built), show(() => !back(), () => sidebarButton(model))]
}

export const deskFrames = (model: Model, built: Built) =>
  div(
    { class: 'flex min-h-0 min-w-0 flex-1' },
    section(
      { 'data-part': 'main', class: ['relative', fill] },
      bar(
        show(
          () => model.state.get() === 'drawer',
          () => sidebarButton(model),
        ),
        backButton(model, built),
        built.column ? div({ class: 'flex min-w-0 flex-1' }, div({ class: [model.kit.bodyColumn, 'flex'] }, built.head)) : built.head,
        asideToggles(model),
      ),
      div({ class: () => [fill, model.roomy.get() ? 'pr-80' : ''] }, built.main),
      asideDrawer(model),
      asideCard(model),
    ),
    asidePanel(model),
  )

export const phoneFrame = (model: Model, built: Built | undefined) =>
  section({ 'data-part': 'main', class: fill }, bar(leadButton(model, built), built?.head ?? div({ class: 'flex-1' }), asideToggles(model)), div({ class: fill }, built?.main ?? null))
