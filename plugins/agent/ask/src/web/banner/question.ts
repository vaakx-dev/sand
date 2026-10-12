import type { AskKind, AskQuestion } from '../../contract'
import type { Kit } from '@sand/ui-kit/contract'
import { div, el, show, span } from '@vaakx-dev/vrui'
import type { AskActions } from '../answering'
import type { AskState } from '../state'
import { choicesView } from './choices'
import { confirmView } from './confirm'
import { rankView } from './rank'

const hints: Partial<Record<AskKind, string>> = { multi: 'Pick any', rank: 'Drag to order' }

const own = ({ icon }: Kit, state: AskState) =>
  div(
    { class: 'flex items-start gap-3 rounded-xl border border-dashed border-accent-500 bg-accent-950 px-3 py-2 text-sm' },
    span({ class: 'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-accent-500 text-neutral-950' }, icon('pencil', 12)),
    span(
      { class: 'flex min-w-0 flex-col' },
      span({ class: 'text-neutral-100' }, 'Your answer'),
      span({ class: 'wrap-anywhere text-xs text-neutral-300 italic' }, () => state.typed.get()),
    ),
  )

const options = (kit: Kit, state: AskState, actions: AskActions, question: AskQuestion) => {
  if (question.type === 'text') return ''
  if (question.type === 'confirm') return confirmView(kit, state, actions, question)
  if (question.type === 'rank') return rankView(kit, state, actions, question)
  return choicesView(kit, state, actions, question)
}

export const questionView = (kit: Kit, state: AskState, actions: AskActions, question: AskQuestion) => {
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
    options(kit, state, actions, question),
    show(() => question.type !== 'text' && Boolean(state.typed.get()), () => own(kit, state)),
  )
}
