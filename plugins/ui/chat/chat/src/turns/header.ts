import { duration } from '@sand/util'
import { div, show, span } from '@vaakx-dev/vrui'
import type { Row } from '@sand/transcript/contract'
import type { TurnHead, TurnPhase } from './fold'
import type { TurnContext } from './rows'

const took = (head: TurnHead) => `Worked for ${duration(Math.max(1000, head.end - (head.start ?? head.end)))}`

const labels: Record<TurnPhase, (head: TurnHead) => string> = {
  thinking: () => 'Thinking',
  working: () => 'Working',
  waiting: () => 'Waiting for you',
  done: took,
}

const busy = (phase: TurnPhase) => phase === 'thinking' || phase === 'working'

export const turnRow = (head: TurnHead, context: TurnContext): Row<TurnHead> => ({
  key: head.key,
  data: head,
  view: data => {
    const { chevron, plainButton, spinner } = context.kit
    const { open, toggle } = context.states.get(head.key)
    return div(
      { class: 'chat-row mt-3 mb-1.5 flex' },
      plainButton(
        {
          'aria-expanded': () => String(open.get()),
          class:
            'inline-flex min-h-6 items-center gap-1.5 rounded-sm text-sm text-neutral-400 transition-colors hover:text-neutral-100 aria-expanded:text-neutral-100 touch:min-h-8',
          onClick: () => {
            toggle()
            context.repaint()
          },
        },
        show(
          () => busy(data.get().phase),
          () => spinner(),
        ),
        span(() => labels[data.get().phase](data.get())),
        chevron(() => open.get()),
      ),
    )
  },
})
