import { duration, plural } from '@sand/kit'
import type { Kit } from '@sand/ui-kit/contract'
import { div, dynamicChild, span, type Sig } from '@vaakx-dev/vrui'
import { row, worked, type RowContext } from '../rows/row'
import type { TurnHead } from './fold'

const callsText = (head: TurnHead) => (head.calls ? ` · ${plural(head.calls, 'tool call')}` : '')

const took = (head: TurnHead) => `Worked for ${duration(Math.max(1000, head.end - (head.start ?? head.end)))}${callsText(head)}`

const working = ({ elapsed }: Kit, head: Sig<TurnHead>) =>
  div(
    { class: 'flex h-6 items-center px-1 text-sm whitespace-pre text-neutral-400' },
    span(() => (head.get().start ? 'Working for ' : 'Working')),
    elapsed(head.map(value => value.start)),
    span(() => callsText(head.get())),
  )

export const turnRow = (head: TurnHead, context: RowContext) =>
  row(head.key, head, data => {
    const { open, toggle } = context.states.get(head.key)
    const unfold = () => {
      toggle()
      context.repaint()
    }
    return div(
      { class: 'mb-3' },
      dynamicChild(
        data.map(value => value.running),
        running => (running ? working(context.kit, data) : worked(context.kit, unfold, open, span(() => took(data.get())))),
      ),
    )
  })
