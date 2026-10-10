import type { ModelInfo } from '@sand/llm-accounts/contract'
import { badge, div, menuItem, span } from '@sand/dom'
import { tokens } from '@sand/kit'
import type { Scene } from './scene'
import { logo, sourceName } from './source'

const radio = (on: boolean) =>
  span(
    { class: ['flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-solid', on ? 'border-accent-400' : 'border-neutral-600'] },
    on && span({ class: 'h-2 w-2 rounded-full bg-accent-400' }),
  )

export const modelRow = (model: ModelInfo, scene: Scene, withSource = false) => {
  const { choice } = scene
  const on = model.id === choice.shown.model
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
    radio(on),
    withSource && logo(model.provider, 14),
    span({ class: 'min-w-0 flex-1 truncate font-medium' }, model.label),
    div(
      { class: 'flex shrink-0 items-center gap-2' },
      scene.fresh(model) && badge('accent', 'New'),
      choice.pending && on && model.id !== choice.current.model && badge('warning', 'Next'),
      model.id === choice.defaults.model && badge('neutral', 'Default'),
      withSource && source && badge('neutral', source.label),
      span({ class: 'font-mono text-xs text-neutral-500' }, model.context ? tokens(model.context) : ''),
    ),
  )
}
