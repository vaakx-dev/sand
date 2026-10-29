import type { Kit } from '@sand/ui-kit/contract'
import { div, list, media, onMount, show, sig, untrack, type Sig } from '@vaakx-dev/vrui'
import type { Row } from './rows/row'

export interface ThreadView {
  id: string
  rows: Sig<Row[]>
  rowList: HTMLElement
  rowEntries: string[]
  visible: Sig<boolean>
  more: Sig<boolean>
  scroll: number | undefined
  first: string | undefined
  above: number
  size: number
}

export type WatchRow = (node: Element) => () => void

const threadView = (id: string): ThreadView => ({
  id,
  rows: sig<Row[]>([]),
  rowList: div({ class: 'pb-6' }),
  rowEntries: [],
  visible: sig(false),
  more: sig(false),
  scroll: undefined,
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

const column = (kit: Kit, view: ThreadView, watch: WatchRow) =>
  div(
    { class: 'mx-auto w-full max-w-3xl px-3 pt-4 md:px-4', hidden: view.visible.map(value => !value) },
    show(view.more, () => moreRow(kit)),
    list(view.rows, row => row.key, rowNode(watch), view.rowList),
    kit.dockFade(),
  )

export const threadViews = (kit: Kit, watch: WatchRow) => {
  const recent = new Map<string, ThreadView>()
  const mounted = sig<ThreadView[]>([])
  const phone = media('(max-width: 767px)')
  const kept = () => (phone.get() ? 2 : 6)

  const drop = (id: string) => {
    recent.delete(id)
    mounted.update(views => views.filter(view => view.id !== id))
  }

  const get = (id: string) => {
    const view = recent.get(id) ?? threadView(id)
    if (!recent.has(id)) mounted.update(views => [...views, view])
    recent.delete(id)
    recent.set(id, view)
    for (const old of [...recent.keys()].slice(0, -untrack(kept))) drop(old)
    return view
  }

  const node = list(
    mounted,
    view => view.id,
    view => column(kit, untrack(() => view.get()), watch),
  )

  return { node, get, drop, ids: () => [...recent.keys()] }
}
