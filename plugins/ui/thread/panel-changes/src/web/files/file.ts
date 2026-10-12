import type { ContextMenu, Kit } from '@sand/ui-kit/contract'
import { derive, div, effect, untrack, type Sig } from '@vaakx-dev/vrui'
import type { FileChange } from '../../changes/collect'
import { diffBody } from '../diff/body'
import { rowsOf } from '../diff/rows'
import type { Display } from '../display'
import type { ChangesState } from '../view'
import { fileHeader } from './header'
import { lazyDiff } from './lazy-diff'
import { diffViewOf, lookOf } from './look'

const lineHeight = 20
const barHeight = 32

const guessHeight = (file: FileChange, open: string[]) => rowsOf(file, new Set(open)).reduce((sum, row) => sum + (row.type === 'line' ? lineHeight : barHeight), 0)

const revealWhenAsked = (file: Sig<FileChange>, revealed: ChangesState['revealed']) => (node: Element) =>
  effect(() => {
    const key = revealed.get()?.key
    if (key && key === untrack(() => file.get().key)) node.scrollIntoView({ block: 'start' })
  })

export const fileView = (kit: Kit, file: Sig<FileChange>, state: ChangesState, display: Display, menu: ContextMenu, scroller: () => HTMLElement) => {
  const look = derive(() => lookOf(file.get(), state, display))
  return div(
    { onMount: revealWhenAsked(file, state.revealed) },
    fileHeader(kit, file, state, display, menu),
    lazyDiff({
      key: () => JSON.stringify(look.get()),
      closed: () => state.isClosed(file.get()),
      guess: () => guessHeight(file.get(), look.get().open),
      draw: () => diffBody(kit, file.get(), diffViewOf(file.get(), look.get(), state, display)),
      scroller,
    }),
  )
}
