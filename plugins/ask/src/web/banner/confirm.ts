import type { AskQuestion } from '@sand/protocol'
import { button, div } from '@sand/dom'
import { choicesOf } from '../../choices'
import type { AskActions } from '../answering'
import type { AskState } from '../state'

const tone = (on: boolean, danger: boolean) => {
  if (!on) return 'bg-neutral-900 text-neutral-200 ring-neutral-700 hover:ring-neutral-500'
  return danger ? 'bg-danger-900 text-danger-200 ring-danger-500' : 'bg-accent-900 text-neutral-100 ring-accent-500'
}

export const confirmView = (state: AskState, actions: AskActions, question: AskQuestion) =>
  div(
    { class: ['flex gap-2', () => (state.draft.get().text.trim() ? 'opacity-50' : '')] },
    ...choicesOf(question).map((option, index) =>
      button(
        {
          type: 'button',
          title: option.description ?? '',
          class: [
            'h-10 min-w-0 flex-1 cursor-pointer truncate rounded-xl text-center px-3 text-sm font-medium ring-1 transition outline-none focus-visible:ring-2',
            () => tone(state.draft.get().picked.includes(index), index === 0 && Boolean(question.risky)),
          ],
          onClick: () => actions.pick(index),
        },
        option.label,
      ),
    ),
  )
