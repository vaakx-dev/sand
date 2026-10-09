import type { EffectiveSettings, ModelInfo, SessionSettings } from '@sand/protocol'
import { badge, div, groupLabel, menuItem, span } from '@sand/dom'
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

const modelRow = (model: ModelInfo, choice: Choice, actions: Actions, offline = false) => {
  const on = model.id === choice.shown.model
  return menuItem(
    {
      role: 'menuitemradio',
      'aria-checked': String(on),
      active: on,
      disabled: offline && !on,
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

const remoteGroup = (pc: string, models: ModelInfo[], choice: Choice, actions: Actions, online: (pc: string) => boolean | undefined) => {
  const offline = online(pc) === false
  return [groupLabel(offline ? `From ${pc} · offline` : `From ${pc}`), ...models.filter(model => model.via === pc).map(model => modelRow(model, choice, actions, offline))]
}

export const modelRows = (models: ModelInfo[], choice: Choice, actions: Actions, online: (pc: string) => boolean | undefined) => {
  const local = models.filter(model => !model.via)
  const pcs = [...new Set(models.flatMap(model => (model.via ? [model.via] : [])))]
  return div(
    { class: 'flex flex-col gap-1 px-1' },
    pcs.length && local.length ? groupLabel('On this PC') : null,
    ...local.map(model => modelRow(model, choice, actions)),
    ...pcs.flatMap(pc => remoteGroup(pc, models, choice, actions, online)),
  )
}
