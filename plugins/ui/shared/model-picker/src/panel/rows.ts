import type { ModelInfo } from '@sand/llm-accounts/contract'
import { badge, div, menuItem, modelLogo, radioMark, span } from '@sand/dom'
import { sourceName, tokens } from '@sand/kit'
import type { Scene } from './scene'

export const modelRow = (model: ModelInfo, scene: Scene, withSource = false) => {
  const on = model.id === scene.shown.model
  const source = scene.source(model)
  return menuItem(
    {
      role: 'menuitemradio',
      'data-focus': `model:${model.id}`,
      'aria-checked': String(on),
      active: on,
      disabled: scene.offline(source) && !on,
      class: 'py-2 hover:bg-neutral-700',
      ...(withSource && source && { title: `${model.label} · ${sourceName(source)}` }),
      ...scene.menu.target(() => scene.menuOf(model), () => scene.pick(model)),
    },
    radioMark(() => on),
    withSource && modelLogo(model.provider, 14),
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
