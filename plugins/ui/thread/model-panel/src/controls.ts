import type { ModelInfo } from '@sand/llm-accounts/contract'
import type { EffectiveSettings, SessionSettings } from '@sand/model/contract'
import { div, icon, primaryAction, secondaryAction, span } from '@sand/dom'
import type { Actions } from './actions'

export const banner = (glyph: string, text: string) =>
  div(
    { class: 'mx-1 mt-2 flex items-start gap-2 rounded-lg bg-warning-950 px-3 py-2 text-xs text-warning-400' },
    span({ class: 'inline-flex shrink-0 pt-px' }, icon(glyph, 14)),
    span(text),
  )

const defaultEffort = (defaults: SessionSettings, model?: ModelInfo) => {
  const wanted = defaults.effort
  if (!model?.efforts.length) return undefined
  return wanted && model.efforts.includes(wanted) ? wanted : model.defaultEffort
}

export const usesDefaults = (shown: EffectiveSettings, defaults: SessionSettings, model?: ModelInfo) =>
  shown.model === defaults.model &&
  shown.effort === defaultEffort(defaults, model) &&
  shown.speed === (model?.fast && defaults.speed === 'fast' ? 'fast' : 'normal')

export const footer = (shown: EffectiveSettings, actions: Actions) =>
  div(
    { class: 'mx-1 mt-2 flex items-center justify-end gap-2 border-t border-solid border-neutral-700 px-2 pt-2 pb-1' },
    secondaryAction({ size: 'sm', onClick: actions.reset }, 'Reset'),
    primaryAction({ size: 'sm', onClick: () => actions.makeDefault(shown) }, 'Make default'),
  )
