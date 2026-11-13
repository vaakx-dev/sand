import { duration } from '@sand/util'
import { div, dynamicChild, span } from '@vaakx-dev/vrui'
import type { Row } from '@sand/transcript/contract'
import type { TurnHead, TurnPhase } from './fold'
import type { ShownWait } from '../wait'
import type { TurnContext } from './rows'

const took = (head: TurnHead) => {
  const time = `Worked for ${duration(Math.max(1000, head.end - (head.start ?? head.end)))}`
  return head.summary ? `${time} · ${head.summary}` : time
}

const labels: Record<TurnPhase, (head: TurnHead) => string> = {
  thinking: () => 'Thinking',
  working: head => (head.summary ? `Working · ${head.summary}` : 'Working'),
  waiting: () => 'Needs you',
  done: took,
}

const busy = (phase: TurnPhase) => phase === 'thinking' || phase === 'working'

export const turnRow = (head: TurnHead, context: TurnContext): Row<TurnHead> => ({
  key: head.key,
  data: head,
  view: data => {
    const { chevron, plainButton, spinner } = context.kit
    const { open, toggle } = context.states.get(head.key)
    const label = () => labels[data.get().phase](data.get())
    return div(
      { class: 'chat-row mb-3 flex min-w-0' },
      plainButton(
        {
          'aria-expanded': () => String(open.get()),
          title: label,
          class:
            'flex min-h-6 min-w-0 max-w-full items-center gap-1.5 rounded-sm text-xs text-neutral-500 transition-colors hover:text-neutral-400 aria-expanded:text-neutral-400 touch:min-h-8',
          onClick: () => {
            toggle()
            context.repaint()
          },
        },
        dynamicChild(
          () => busy(data.get().phase),
          live => (live ? spinner('xs') : chevron(() => open.get(), 'xs')),
        ),
        span({ class: 'min-w-0 truncate' }, label),
      ),
    )
  },
})

export const waitingRow = (head: TurnHead, context: TurnContext, wait: ShownWait): Row<TurnHead> => ({
  key: `${head.key}:wait:${wait.key}`,
  data: head,
  view: () => {
    const { chevron, plainButton } = context.kit
    const { open, toggle } = context.states.get(head.key)
    return div(
      { class: 'chat-row mb-3 flex min-w-0 items-start gap-1.5' },
      plainButton(
        {
          'aria-expanded': () => String(open.get()),
          'aria-label': 'Show the steps',
          class: 'flex min-h-6 shrink-0 items-center rounded-sm text-neutral-500 hover:text-neutral-400 touch:min-h-8',
          onClick: () => {
            toggle()
            context.repaint()
          },
        },
        chevron(() => open.get(), 'xs'),
      ),
      wait.render(),
    )
  },
})
