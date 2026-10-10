import { div, duration, dynamicChild, elapsed, span, type Sig } from '@sand/dom'
import { plural } from '@sand/kit'
import { row, worked, type Row, type RowContext } from '../rows/row'
import type { TurnHead } from './fold'

const callsText = (head: TurnHead) => (head.calls ? ` · ${plural(head.calls, 'tool call')}` : '')

const took = (head: TurnHead) => `Worked for ${duration(Math.max(1000, head.end - (head.start ?? head.end)))}${callsText(head)}`

const working = (head: Sig<TurnHead>) =>
  div(
    { class: 'flex h-6 items-center px-1 text-sm whitespace-pre text-neutral-400' },
    span(() => (head.get().start ? 'Working for ' : 'Working')),
    elapsed(head.map(value => value.start)),
    span(() => callsText(head.get())),
  )

export const turnRow = (head: TurnHead, context: RowContext): Row =>
  row(head.key, head, data => {
    const { open, toggle } = context.states.get(head.key)
    const flip = () => {
      toggle()
      context.repaint()
    }
    return div(
      { class: 'mb-3' },
      dynamicChild(
        data.map(value => value.running),
        running => (running ? working(data) : worked(flip, open, span(() => took(data.get())))),
      ),
    )
  })
