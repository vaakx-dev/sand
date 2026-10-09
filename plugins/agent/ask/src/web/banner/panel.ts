import { derive, div, dynamicChild, show, SPACE } from '@sand/dom'
import type { AskActions } from '../answering'
import type { AskState } from '../state'
import { askHeader } from './header'
import { questionView } from './question'

const tuck = SPACE['4']

export const askBanner = (state: AskState, actions: AskActions) => {
  const risky = derive(() => Boolean(state.question.get().risky))
  return div(
    {
      role: 'group',
      'aria-label': 'Questions from sand',
      class: [
        'relative mx-6 rounded-2xl px-3 pt-1 pb-6 text-xs ring-1 animate-rise',
        () => (risky.get() ? 'bg-danger-950 ring-danger-500' : 'bg-accent-950 ring-accent-500'),
      ],
      style: { marginBottom: `calc(-1 * ${tuck})` },
    },
    askHeader(state, actions),
    show(
      derive(() => state.open.get()),
      () =>
        div(
          { class: 'max-h-96 overflow-auto pt-1 pb-2' },
          dynamicChild(state.current, index => questionView(state, actions, state.questions[index]!)),
        ),
    ),
  )
}
