import type { Kit } from '@sand/ui-kit/contract'
import { duration } from '@sand/util'
import { dynamicChild, span, type Sig } from '@vaakx-dev/vrui'
import { row, workFrame, type RowContext } from '../rows/row'
import type { TurnHead } from './fold'

const took = (head: TurnHead) => `Worked for ${duration(Math.max(1000, head.end - (head.start ?? head.end)))}`

const working = ({ elapsed }: Kit, head: Sig<TurnHead>) =>
  span({ class: 'whitespace-pre' }, span(() => (head.get().start ? 'Working for ' : 'Working')), elapsed(head.map(value => value.start)))

const kinds = (head: TurnHead) => (head.running ? (head.current ?? '') : head.kinds.join(' · '))

const phase = ({ running, waiting }: TurnHead) => {
  if (waiting) return 'waiting'
  return running ? 'working' : 'done'
}

export const turnRow = (head: TurnHead, context: RowContext) =>
  row(head.key, head, data => {
    const { chevron, toolCard } = context.kit
    const { open, toggle } = context.states.get(head.key)
    const labels = {
      working: () => working(context.kit, data),
      waiting: () => span('Waiting for you'),
      done: () => span(() => took(data.get())),
    }
    const label = dynamicChild(data.map(phase), shown => labels[shown]())
    return workFrame(
      toolCard({
        icon: chevron(() => open.get()),
        verb: label,
        target: () => kinds(data.get()),
        targetClass: 'text-xs text-neutral-500',
        expanded: open,
        onToggle: () => {
          toggle()
          context.repaint()
        },
      }),
    )
  })
