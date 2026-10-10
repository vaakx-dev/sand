import type { EffectiveSettings } from '@sand/model/contract'
import type { Picked } from '@sand/model-picker/contract'
import { div, icon, primaryAction, secondaryAction, span, type IconName } from '@sand/dom'
import type { Actions } from './actions'

export const banner = (glyph: IconName, text: string) =>
  div(
    { class: 'mx-1 mt-2 flex items-start gap-2 rounded-lg bg-warning-950 px-3 py-2 text-xs text-warning-400' },
    span({ class: 'inline-flex shrink-0 pt-px' }, icon(glyph, 14)),
    span(text),
  )

export const usesDefaults = (shown: EffectiveSettings, defaults: Picked) =>
  shown.model === defaults.model && shown.effort === defaults.effort && shown.speed === defaults.speed

export const footer = (shown: EffectiveSettings, actions: Actions) =>
  div(
    { class: 'mx-1 mt-2 flex items-center justify-end gap-2 border-t border-solid border-neutral-700 px-2 pt-2 pb-1' },
    secondaryAction({ size: 'sm', onClick: actions.reset }, 'Reset'),
    primaryAction({ size: 'sm', onClick: () => actions.makeDefault(shown) }, 'Make default'),
  )
