import type { ModelInfo } from '@sand/llm-accounts/contract'
import { sourceName, tokens } from '@sand/kit'
import { div, span } from '@vaakx-dev/vrui'
import type { Scene } from './scene'

export const modelRow = (model: ModelInfo, scene: Scene, withSource = false) => {
  const { badge, choiceItem, modelLogo } = scene.kit
  const on = model.id === scene.shown.model
  const source = scene.source(model)
  return choiceItem(
    {
      'data-focus': `model:${model.id}`,
      selected: on,
      disabled: scene.offline(source) && !on,
      ...(withSource && source && { title: `${model.label} · ${sourceName(source)}` }),
      ...scene.menu.target(() => scene.menuOf(model), () => scene.pick(model)),
    },
    withSource && span({ class: 'inline-flex shrink-0' }, modelLogo(model.provider, 16)),
    span({ class: 'min-w-0 flex-1 truncate font-medium' }, model.label),
    div(
      { class: 'flex shrink-0 items-center gap-2' },
      scene.fresh(model) && badge('accent', 'New'),
      scene.target.badge?.(model),
      model.id === scene.defaults.model && badge('neutral', 'Default'),
      withSource && source && badge('neutral', source.label),
      span({ class: 'font-mono text-xs text-neutral-500' }, model.context ? tokens(model.context) : ''),
    ),
  )
}
