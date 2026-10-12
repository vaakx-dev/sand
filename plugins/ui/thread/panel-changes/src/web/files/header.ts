import { badge, checkMark, chevron, div, layer, paneRow, quietButton, show, span, type ContextMenu, type Sig } from '@sand/dom'
import type { FileChange } from '../../changes/collect'
import { counts, diffstat } from '../counts'
import type { Display } from '../display'
import type { ChangesState } from '../view'
import { fileMenu } from './menu'
import { pathLabel } from './path'

const viewedToggle = (file: Sig<FileChange>, state: ChangesState, display: Display) => {
  const viewed = () => state.viewed.has(file.get())
  return quietButton(
    { size: 'sm', title: 'Mark as viewed', 'aria-pressed': () => String(viewed()), onClick: () => state.markViewed(file.get()) },
    checkMark(viewed),
    show(
      () => !display.compact(),
      () => span('Viewed'),
    ),
  )
}

export const fileHeader = (file: Sig<FileChange>, state: ChangesState, display: Display, menu: ContextMenu) =>
  div(
    { class: [layer.sticky, 'sticky top-0 flex h-10 items-center gap-2 border-b border-neutral-800 bg-neutral-950 px-2 text-xs'] },
    paneRow(
      {
        class: 'flex-1',
        title: file.map(value => value.path),
        'aria-expanded': () => String(!state.isClosed(file.get())),
        ...menu.target(
          () => fileMenu(file.get(), state),
          () => state.toggle(file.get()),
        ),
      },
      span({ class: 'inline-flex shrink-0 text-neutral-500' }, chevron(() => !state.isClosed(file.get()), 14)),
      pathLabel(() => file.get().path),
    ),
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
    show(
      () => !display.compact(),
      () =>
        diffstat(
          () => file.get().add,
          () => file.get().del,
        ),
    ),
    viewedToggle(file, state, display),
  )
