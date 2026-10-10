import type { ModelInfo } from '@sand/llm-accounts/contract'
import { div, icon, primaryAction, secondaryAction, span, toggleSwitch } from '@sand/dom'
import type { Actions } from '../actions'
import type { Choice } from './scene'

export const banner = (glyph: string, text: string) =>
  div(
    { class: 'mx-1 mt-2 flex items-start gap-2 rounded-lg bg-warning-950 px-3 py-2 text-xs text-warning-400' },
    span({ class: 'inline-flex shrink-0 pt-px' }, icon(glyph, 14)),
    span(text),
  )

export const fastRow = (choice: Choice, actions: Actions) => {
  const { shown } = choice
  const on = shown.speed === 'fast'
  return div(
    { class: 'mx-1 mt-1 flex items-center gap-3 rounded-lg px-3 py-2' },
    span({ class: ['min-w-0 flex-1 text-sm font-medium', shown.supportsFast ? 'text-neutral-300' : 'text-neutral-500'] }, 'Fast mode'),
    toggleSwitch({ on, disabled: !shown.supportsFast, 'aria-label': 'Fast mode', onClick: () => actions.set({ speed: on ? 'normal' : 'fast' }) }),
  )
}

const defaultEffort = (choice: Choice, model?: ModelInfo) => {
  const wanted = choice.defaults.effort
  if (!model?.efforts.length) return undefined
  return wanted && model.efforts.includes(wanted) ? wanted : model.defaultEffort
}

export const usesDefaults = (choice: Choice, model?: ModelInfo) =>
  choice.shown.model === choice.defaults.model &&
  choice.shown.effort === defaultEffort(choice, model) &&
  choice.shown.speed === (model?.fast && choice.defaults.speed === 'fast' ? 'fast' : 'normal')

export const footer = (choice: Choice, actions: Actions) =>
  div(
    { class: 'mx-1 mt-2 flex items-center justify-end gap-2 border-t border-solid border-neutral-700 px-2 pt-2 pb-1' },
    secondaryAction({ size: 'sm', onClick: actions.reset }, 'Reset'),
    primaryAction({ size: 'sm', onClick: () => actions.makeDefault(choice.shown) }, 'Make default'),
  )
