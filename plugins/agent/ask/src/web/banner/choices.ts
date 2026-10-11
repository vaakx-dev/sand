import type { AskOption, AskQuestion } from '../../contract'
import { div, el, sig, span, type Sig } from '@sand/dom'
import type { AskActions } from '../answering'
import type { AskState } from '../state'
import { marker } from './marker'
import { optionButton } from './option'

const card = (state: AskState, actions: AskActions, question: AskQuestion, option: AskOption, index: number, focused: Sig<number>) => {
  const on = () => state.draft.get().picked.includes(index)
  return optionButton(
    on,
    false,
    {
      class: ['flex items-start gap-3 py-2 text-left', () => (state.typed.get() ? 'opacity-50' : '')],
      onClick: () => actions.pick(index),
      onPointerEnter: () => focused.set(index),
      onFocus: () => focused.set(index),
    },
    marker(question.type !== 'multi', String(index + 1), on),
    span(
      { class: 'flex min-w-0 flex-col' },
      span(
        { class: 'wrap-anywhere' },
        option.label,
        option.recommended ? span({ class: 'ml-2 text-xs font-medium text-accent-400' }, 'Recommended') : '',
      ),
      option.description ? span({ class: 'text-xs text-neutral-400' }, option.description) : '',
    ),
  )
}

const preview = (question: AskQuestion, focused: Sig<number>) =>
  el(
    'pre',
    { class: 'h-full max-h-64 overflow-auto rounded-xl bg-neutral-950 px-3 py-2 font-mono text-xs text-neutral-300' },
    () => question.options[focused.get()]?.preview ?? '',
  )

export const choicesView = (state: AskState, actions: AskActions, question: AskQuestion) => {
  const first = state.draft.get().picked[0] ?? Math.max(0, question.options.findIndex(option => option.recommended))
  const focused = sig(first)
  const cards = question.options.map((option, index) => card(state, actions, question, option, index, focused))
  if (!question.options.some(option => option.preview)) return div({ class: 'grid grid-cols-1 gap-2 sm:grid-cols-2' }, ...cards)
  return div(
    { class: 'grid grid-cols-1 gap-2 md:grid-cols-2' },
    div({ class: 'flex flex-col gap-2' }, ...cards),
    div({ class: 'min-w-0', hidden: () => !question.options[focused.get()]?.preview }, preview(question, focused)),
  )
}
