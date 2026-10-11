import { badge, chevron, div, effect, layer, rowButton, show, span, untrack, type ContextMenu, type Sig } from '@sand/dom'
import type { FileChange } from '../changes/collect'
import { counts } from './counts'
import { lazyDiff } from './lazy-diff'
import { fileMenu } from './menu'
import type { ChangesState } from './view'

const revealWhenAsked = (file: Sig<FileChange>, revealed: ChangesState['revealed']) => (node: Element) =>
  effect(() => {
    const key = revealed.get()?.key
    if (key && key === untrack(() => file.get().key)) node.scrollIntoView({ block: 'start' })
  })

export const fileView = (file: Sig<FileChange>, { closed, revealed, copy, scroller }: ChangesState, toggle: (key: string) => void, menu: ContextMenu) => {
  const isClosed = () => Boolean(closed.get()[file.get().key])
  const shape = () => {
    const { add, del, hunks } = file.get()
    return `${add}|${del}|${hunks.length}|${isClosed()}`
  }
  return div(
    { onMount: revealWhenAsked(file, revealed) },
    rowButton(
      {
        class: [layer.sticky, 'sticky top-0 h-10 gap-2 bg-neutral-950 px-4 text-xs text-neutral-300 hover:bg-neutral-900'],
        title: file.map(value => value.path),
        ...menu.target(
          () => fileMenu(file.get(), isClosed(), toggle, copy),
          () => toggle(file.get().key),
        ),
      },
      chevron(() => !isClosed()),
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
    lazyDiff(file, shape, isClosed, scroller),
  )
}
