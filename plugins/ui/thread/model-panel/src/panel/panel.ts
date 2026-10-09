import type { ModelInfo } from '@sand/protocol'
import { div, icon, primaryAction, secondaryAction, span, toggleSwitch, type Sig } from '@sand/dom'
import type { Actions, PanelContext } from '../actions'
import type { PcStatus } from '../pcs'
import { effortBar } from './effort'
import { modelRows, type Choice } from './rows'

const banner = (glyph: string, text: string) =>
  div(
    { class: 'mx-1 mt-1 flex items-start gap-2 rounded-lg bg-warning-950 px-3 py-2 text-xs text-warning-400' },
    span({ class: 'inline-flex shrink-0 pt-px' }, icon(glyph, 14)),
    span(text),
  )

const fastRow = (choice: Choice, actions: Actions) => {
  const { shown } = choice
  const on = shown.speed === 'fast'
  return div(
    { class: 'mt-1 flex items-center gap-3 rounded-lg px-3 py-2' },
    span({ class: ['min-w-0 flex-1 text-sm font-medium', shown.supportsFast ? 'text-neutral-300' : 'text-neutral-500'] }, 'Fast mode'),
    toggleSwitch({ on, disabled: !shown.supportsFast, 'aria-label': 'Fast mode', onClick: () => actions.set({ speed: on ? 'normal' : 'fast' }) }),
  )
}

const defaultEffort = (choice: Choice, model?: ModelInfo) => {
  const wanted = choice.defaults.effort
  if (!model?.efforts.length) return undefined
  return wanted && model.efforts.includes(wanted) ? wanted : model.defaultEffort
}

const usesDefaults = (choice: Choice, model?: ModelInfo) =>
  choice.shown.model === choice.defaults.model &&
  choice.shown.effort === defaultEffort(choice, model) &&
  choice.shown.speed === (model?.fast && choice.defaults.speed === 'fast' ? 'fast' : 'normal')

const footer = (choice: Choice, actions: Actions) =>
  div(
    { class: 'mx-1 mt-2 flex items-center justify-end gap-2 border-t border-solid border-neutral-700 px-2 pt-2 pb-1' },
    secondaryAction({ size: 'sm', onClick: actions.reset }, 'Reset'),
    primaryAction({ size: 'sm', onClick: () => actions.makeDefault(choice.shown) }, 'Make default'),
  )

export const panelBody = (ctx: PanelContext, actions: Actions, flash: Sig<boolean>, problem: string, pcs: PcStatus) => {
  const state = ctx.models.state()
  if (!state) return div({ class: 'px-3 py-4 text-xs text-neutral-500' }, 'Loading the models…')
  const thread = ctx.threads.current()
  const choice: Choice = { shown: state.next ?? state.current, current: state.current, pending: Boolean(state.next), defaults: ctx.models.defaults() }
  const model = ctx.models.info(choice.shown.model)
  return div(
    { class: 'flex flex-col pb-1' },
    thread?.running && banner('clock', 'A turn is running. Changes apply when it finishes.'),
    problem && banner('alert', problem),
    modelRows(ctx.models.list(), choice, actions, pcs.online),
    effortBar(choice, ctx.models.levels(), model, flash, actions),
    fastRow(choice, actions),
    !usesDefaults(choice, model) && footer(choice, actions),
  )
}
