import { derive, div, dynamicChild, icon, iconButton, quietButton, span } from '@sand/dom'
import type { AskActions } from '../answering'
import type { AskState } from '../state'

const dots = (state: AskState) =>
  span(
    { class: 'mr-1 flex items-center gap-1' },
    ...state.questions.map((_, index) =>
      span({
        class: [
          'h-2 w-2 rounded-full transition-colors',
          () => {
            if (index === state.current.get()) return 'bg-accent-400'
            return state.answered(index) ? 'bg-success-500' : 'bg-neutral-600'
          },
        ],
      }),
    ),
  )

const stepper = (state: AskState, actions: AskActions) =>
  span(
    { class: 'flex shrink-0 items-center' },
    iconButton(
      { size: 'sm', title: 'Previous question (Alt+←)', disabled: () => state.current.get() === 0, onClick: () => actions.go(state.current.get() - 1) },
      icon('left', 14),
    ),
    span({ class: 'w-8 text-center font-mono text-neutral-200' }, () => `${state.current.get() + 1}/${state.questions.length}`),
    iconButton(
      {
        size: 'sm',
        title: 'Next question (Alt+→)',
        disabled: () => state.current.get() === state.questions.length - 1,
        onClick: () => actions.go(state.current.get() + 1),
      },
      icon('right', 14),
    ),
  )

export const askHeader = (state: AskState, actions: AskActions) => {
  const several = state.questions.length > 1
  return div(
    { class: 'flex min-h-8 items-center gap-1 text-neutral-400' },
    several ? stepper(state, actions) : span({ class: 'inline-flex shrink-0 px-1 text-accent-400' }, icon('help', 14)),
    span({ class: 'ml-1 min-w-0 truncate text-sm font-medium text-neutral-100' }, () => state.question.get().name),
    span({ class: 'min-w-2 flex-1' }),
    several ? dots(state) : '',
    quietButton({ size: 'sm', title: 'Skip these questions', disabled: () => state.sending.get(), onClick: actions.skip }, 'Skip'),
    iconButton(
      { size: 'sm', title: () => (state.open.get() ? 'Collapse' : 'Expand'), onClick: () => state.open.update(open => !open) },
      dynamicChild(derive(() => state.open.get()), open => span({ class: 'inline-flex' }, icon(open ? 'down' : 'up', 14))),
    ),
  )
}
