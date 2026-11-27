import { duration } from '@sand/util'
import { clock, div, dynamicChild, span, type Sig } from '@vaakx-dev/vrui'
import { ranText, type Row } from '@sand/transcript/contract'
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

const stepTime = (started: number) => {
  const now = clock()
  return span({ class: 'shrink-0 whitespace-pre' }, () => {
    const ran = ranText(started, now.get())
    return ran && ` · running ${ran}`
  })
}

const liveThought = (data: Sig<TurnHead>, open: Sig<boolean>) =>
  dynamicChild(
    () => (open.get() ? undefined : data.get().thought?.key),
    key => (key === undefined ? undefined : span({ class: 'line-clamp-2 animate-fade pl-5 wrap-anywhere sm:line-clamp-1' }, () => data.get().thought?.body)),
  )

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
            'flex min-w-0 max-w-full flex-col rounded-sm text-left text-xs text-neutral-500 transition-colors hover:text-neutral-400 aria-expanded:text-neutral-400',
          onClick: () => {
            toggle()
            context.repaint()
          },
        },
        span(
          { class: 'flex min-w-0 items-center gap-2 leading-6 touch:leading-8' },
          span(
            { class: 'inline-flex w-3 shrink-0 justify-center' },
            dynamicChild(
              () => busy(data.get().phase),
              live => (live ? spinner('xs') : chevron(() => open.get(), 'xs')),
            ),
          ),
          span(
            { class: 'flex min-w-0' },
            span({ class: 'min-w-0 truncate' }, label),
            dynamicChild(
              () => data.get().stepStarted,
              started => (started ? stepTime(started) : undefined),
            ),
          ),
        ),
        liveThought(data, open),
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
      { class: 'chat-row mb-3 flex min-w-0 items-center gap-2' },
      plainButton(
        {
          'aria-expanded': () => String(open.get()),
          'aria-label': 'Show the steps',
          class: 'flex min-h-6 w-3 shrink-0 items-center justify-center rounded-sm text-neutral-500 hover:text-neutral-400 touch:min-h-8',
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
