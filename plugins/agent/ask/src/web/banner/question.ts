import type { AskKind, AskQuestion } from '../../contract'
import { derive, div, el, icon, show, span } from '@sand/dom'
import type { AskActions } from '../answering'
import type { AskState } from '../state'
import { choicesView } from './choices'
import { confirmView } from './confirm'
import { rankView } from './rank'

const hints: Partial<Record<AskKind, string>> = { multi: 'Pick any', rank: 'Drag to order' }

const own = (state: AskState) =>
  div(
    { class: 'ask-own flex items-start gap-3 rounded-xl bg-accent-950 px-3 py-2 text-sm' },
    span({ class: 'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-accent-500 text-white' }, icon('pencil', 12)),
    span(
      { class: 'flex min-w-0 flex-col' },
      span({ class: 'text-neutral-100' }, 'Your answer'),
      span({ class: 'wrap-anywhere text-xs text-neutral-300 italic' }, () => state.draft.get().text.trim()),
    ),
  )

const options = (state: AskState, actions: AskActions, question: AskQuestion) => {
  if (question.type === 'text') return ''
  if (question.type === 'confirm') return confirmView(state, actions, question)
  if (question.type === 'rank') return rankView(state, actions, question)
  return choicesView(state, actions, question)
}

export const questionView = (state: AskState, actions: AskActions, question: AskQuestion) => {
  const typed = derive(() => question.type !== 'text' && Boolean(state.draft.get().text.trim()))
  const hint = hints[question.type]
  return div(
    { class: 'flex flex-col gap-2' },
    div(
      { class: 'text-sm font-medium text-neutral-100' },
      question.question,
      hint ? span({ class: 'ml-2 text-xs font-normal text-neutral-500' }, hint) : '',
    ),
    question.detail
      ? el('pre', { class: 'max-h-40 overflow-auto rounded-lg bg-neutral-950 px-3 py-2 font-mono text-xs whitespace-pre-wrap wrap-anywhere text-neutral-300' }, question.detail)
      : '',
    options(state, actions, question),
    show(typed, () => own(state)),
  )
}
