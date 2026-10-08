import type { EffectiveSettings, ModelInfo, SessionSettings } from '@sand/protocol'
import { badge, div, menuItem, span } from '@sand/dom'
import { tokens } from '@sand/kit'
import type { Actions } from '../actions'

export interface Choice {
  shown: EffectiveSettings
  current: EffectiveSettings
  pending: boolean
  defaults: SessionSettings
}

const radio = (on: boolean) =>
  span(
    { class: ['flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-solid', on ? 'border-accent-400' : 'border-neutral-600'] },
    on && span({ class: 'h-2 w-2 rounded-full bg-accent-400' }),
  )

const modelRow = (model: ModelInfo, choice: Choice, actions: Actions) => {
  const on = model.id === choice.shown.model
  return menuItem(
    {
      role: 'menuitemradio',
      'aria-checked': String(on),
      active: on,
      class: 'py-2 hover:bg-neutral-700',
      onClick: () => actions.set({ model: model.id }),
    },
    radio(on),
    span({ class: 'min-w-0 flex-1 truncate font-medium' }, model.label),
    div(
      { class: 'flex shrink-0 items-center gap-2' },
      choice.pending && on && model.id !== choice.current.model && badge('warning', 'Next'),
      model.id === choice.defaults.model && badge('neutral', 'Default'),
      span({ class: 'font-mono text-xs text-neutral-500' }, model.context ? tokens(model.context) : ''),
    ),
  )
}

export const modelRows = (models: ModelInfo[], choice: Choice, actions: Actions) =>
  div({ class: 'flex flex-col gap-1 px-1' }, ...models.map(model => modelRow(model, choice, actions)))
