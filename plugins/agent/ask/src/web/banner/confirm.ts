import type { AskQuestion } from '../../contract'
import type { Kit } from '@sand/ui-kit/contract'
import { div } from '@vaakx-dev/vrui'
import { choicesOf } from '../../reply'
import type { AskActions } from '../answering'
import type { AskState } from '../state'
import { optionButton } from './option'

export const confirmView = (kit: Kit, state: AskState, actions: AskActions, question: AskQuestion) =>
  div(
    { class: ['flex gap-2', () => (state.typed.get() ? 'opacity-50' : '')] },
    ...choicesOf(question).map((option, index) =>
      optionButton(
        kit,
        () => state.draft.get().picked.includes(index),
        index === 0 && Boolean(question.risky),
        { class: 'h-10 flex-1 truncate text-center font-medium', title: option.description ?? '', onClick: () => actions.pick(index) },
        option.label,
      ),
    ),
  )
