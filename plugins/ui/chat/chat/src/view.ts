import type { Kit } from '@sand/ui-kit/contract'
import { div, list, onMount, show, sig, untrack, type Sig } from '@vaakx-dev/vrui'
import type { BranchLists } from './branches'
import type { Row } from '@sand/transcript/contract'

export interface ThreadView {
  id: string
  rows: Sig<Row[]>
  rowList: HTMLElement
  rowEntries: string[]
  visible: Sig<boolean>
  more: Sig<boolean>
  branches: BranchLists
  first: string | undefined
  above: number
  size: number
}

export type WatchRow = (node: Element) => () => void

export const threadView = (id: string, branches: BranchLists): ThreadView => ({
  id,
  rows: sig<Row[]>([]),
  rowList: div({ class: 'pb-6' }),
  rowEntries: [],
  visible: sig(false),
  more: sig(false),
  branches,
  first: undefined,
  above: 0,
  size: 0,
})

const rowNode = (watch: WatchRow) => (row: Sig<Row>) => {
  const node = untrack(() => row.get()).view(row.map(value => value.data))
  onMount(node, () => watch(node))
  return node
}

const moreRow = ({ spinner }: Kit) => div({ class: 'flex h-10 items-center justify-center text-neutral-500' }, spinner())

export const threadColumn = (kit: Kit, view: ThreadView, watch: WatchRow) =>
  div(
    { class: [kit.pageColumn, 'px-3 pt-4 md:px-4'], hidden: view.visible.map(value => !value) },
    show(view.more, () => moreRow(kit)),
    list(view.rows, row => row.key, rowNode(watch), view.rowList),
    kit.dockFade(),
  )
