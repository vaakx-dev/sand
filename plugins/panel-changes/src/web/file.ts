import { badge, button, div, dynamicChild, effect, icon, layer, show, span, untrack, type Sig } from '@sand/dom'
import type { FileChange } from '../changes/collect'
import { counts } from './counts'
import { diffNodes } from './diff'
import type { ChangesState } from './view'

const revealWhenAsked = (file: Sig<FileChange>, revealed: ChangesState['revealed']) => (node: Node) =>
  effect(() => {
    const key = revealed.get()?.key
    if (key && key === untrack(() => file.get().key)) (node as HTMLElement).scrollIntoView({ block: 'start' })
  })

export const fileView = (file: Sig<FileChange>, { closed, revealed }: ChangesState, toggle: (key: string) => void) => {
  const isClosed = () => Boolean(closed.get()[file.get().key])
  const shape = () => {
    const { add, del, hunks } = file.get()
    return `${add}|${del}|${hunks.length}|${isClosed()}`
  }
  return div(
    { onMount: revealWhenAsked(file, revealed) },
    button(
      {
        type: 'button',
        class: [layer.sticky, 'sticky flex h-10 w-full items-center gap-2 bg-neutral-950 px-4 text-xs text-neutral-300 cursor-pointer hover:bg-neutral-900'],
        style: { top: '0' },
        title: file.map(value => value.path),
        onClick: () => toggle(file.get().key),
      },
      span({ class: ['inline-flex text-neutral-400 transition', () => (isClosed() ? '-rotate-90' : '')] }, icon('down', 13)),
      span({ class: 'min-w-0 flex-1 truncate font-mono' }, file.map(value => value.path)),
      show(
        file.map(value => Boolean(value.agent)),
        () => badge('accent', span({ class: 'max-w-32 truncate' }, file.map(value => value.agent ?? ''))),
      ),
      show(
        file.map(value => value.outside),
        () => badge('neutral', 'outside project'),
      ),
      counts(
        () => file.get().add,
        () => file.get().del,
      ),
    ),
    dynamicChild(shape, () => (isClosed() ? div({ class: 'hidden' }) : div(diffNodes(file.get())))),
  )
}
