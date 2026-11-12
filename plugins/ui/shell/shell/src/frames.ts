import { div, section, show } from '@vaakx-dev/vrui'
import { bar } from './bar'
import type { Model } from './model'
import { asideCard, asideDrawer, asidePanel, asideToggles } from './aside'
import type { Built } from './screens'

const fill = 'flex min-h-0 min-w-0 flex-1 flex-col'

export const toolButton = (model: Model, label: string, glyph: string, onClick: () => void) =>
  model.kit.iconButton({ title: label, 'aria-label': label, onClick }, model.kit.icon(glyph))

const sidebarButton = (model: Model) => toolButton(model, 'Show the sidebar', 'sidebar', () => model.setDrawer(true))

export const deskFrames = (model: Model, built: Built) =>
  div(
    { class: 'flex min-h-0 min-w-0 flex-1' },
    section(
      { class: ['relative', fill] },
      bar(
        show(
          () => model.state.get() === 'drawer',
          () => sidebarButton(model),
        ),
        built.head,
        asideToggles(model),
      ),
      div({ class: () => [fill, model.roomy.get() ? 'pr-80' : ''] }, built.main),
      asideDrawer(model),
      asideCard(model),
    ),
    asidePanel(model),
  )

export const phoneFrame = (model: Model, built: Built | undefined) =>
  section({ class: fill }, bar(sidebarButton(model), built?.head ?? div({ class: 'flex-1' }), asideToggles(model)), div({ class: fill }, built?.main ?? null))
