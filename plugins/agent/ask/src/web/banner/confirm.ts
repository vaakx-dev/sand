import type { AskQuestion } from '../../contract'
import { div } from '@sand/dom'
import { choicesOf } from '../../reply'
import type { AskActions } from '../answering'
import type { AskState } from '../state'
import { optionButton } from './option'

export const confirmView = (state: AskState, actions: AskActions, question: AskQuestion) =>
  div(
    { class: ['flex gap-2', () => (state.typed.get() ? 'opacity-50' : '')] },
    ...choicesOf(question).map((option, index) =>
      optionButton(
        () => state.draft.get().picked.includes(index),
        index === 0 && Boolean(question.risky),
        { class: 'h-10 flex-1 truncate text-center font-medium', title: option.description ?? '', onClick: () => actions.pick(index) },
        option.label,
      ),
    ),
  )
