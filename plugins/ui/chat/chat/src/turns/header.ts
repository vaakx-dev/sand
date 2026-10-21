import type { Kit } from '@sand/ui-kit/contract'
import { duration } from '@sand/util'
import { div, dynamicChild, span, type Sig } from '@vaakx-dev/vrui'
import { row, worked, type RowContext } from '../rows/row'
import type { TurnHead } from './fold'

const took = (head: TurnHead) => `Worked for ${duration(Math.max(1000, head.end - (head.start ?? head.end)))}`

const working = ({ elapsed }: Kit, head: Sig<TurnHead>) =>
  span({ class: 'whitespace-pre' }, span(() => (head.get().start ? 'Working for ' : 'Working')), elapsed(head.map(value => value.start)))

const kinds = (head: TurnHead) => (head.running ? (head.current ?? '') : head.kinds.join(' · '))

export const turnRow = (head: TurnHead, context: RowContext) =>
  row(head.key, head, data => {
    const { open, toggle } = context.states.get(head.key)
    const unfold = () => {
      toggle()
      context.repaint()
    }
    const label = dynamicChild(
      data.map(value => value.running),
      running => (running ? working(context.kit, data) : span(() => took(data.get()))),
    )
    return div(
      { class: 'mb-3' },
      worked(context.kit, unfold, open, label),
      div({ class: () => (kinds(data.get()) ? 'truncate px-1 text-xs text-neutral-500' : 'hidden') }, () => kinds(data.get())),
    )
  })
