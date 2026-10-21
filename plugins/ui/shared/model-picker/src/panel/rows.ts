import type { ModelInfo } from '@sand/accounts/contract'
import { tokens } from '@sand/util'
import { div, span } from '@vaakx-dev/vrui'
import type { Scene } from './scene'

export const modelRow = (model: ModelInfo, scene: Scene, withLogo = false) => {
  const { badge, choiceItem, modelLogo } = scene.kit
  const on = model.id === scene.shown.model
  return choiceItem(
    {
      'data-focus': `model:${model.id}`,
      selected: on,
      disabled: scene.offline(scene.source(model)) && !on,
      ...scene.menu.target(() => scene.menuOf(model), () => scene.pick(model)),
    },
    withLogo && span({ class: 'inline-flex shrink-0' }, modelLogo(model.provider, 16)),
    span({ class: 'min-w-0 flex-1 truncate font-medium' }, model.label),
    div(
      { class: 'flex shrink-0 items-center gap-2' },
      scene.fresh(model) && badge('accent', 'New'),
      scene.target.badge?.(model),
      model.id === scene.defaults.model && badge('neutral', 'Default'),
      span({ class: 'font-mono text-xs text-neutral-500' }, model.context ? tokens(model.context) : ''),
    ),
  )
}
