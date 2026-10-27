import type { Kit } from '@sand/ui-kit/contract'
import { div, list, sig, untrack, type Sig } from '@vaakx-dev/vrui'
import type { Row } from './rows/row'

export interface ThreadView {
  id: string
  rows: Sig<Row[]>
  rowList: HTMLElement
  visible: Sig<boolean>
  scroll: number | undefined
  first: string | undefined
  truncated: boolean
  size: number
}

const kept = 6

const threadView = (id: string): ThreadView => ({
  id,
  rows: sig<Row[]>([]),
  rowList: div({ class: 'pb-6' }),
  visible: sig(false),
  scroll: undefined,
  first: undefined,
  truncated: false,
  size: 0,
})

const rowNode = (row: Sig<Row>) => untrack(() => row.get()).view(row.map(value => value.data))

const column = ({ dockFade }: Kit, view: ThreadView) =>
  div(
    { class: 'mx-auto w-full max-w-3xl px-3 pt-4 md:px-4', hidden: view.visible.map(value => !value) },
    list(view.rows, row => row.key, rowNode, view.rowList),
    dockFade(),
  )

export const threadViews = (kit: Kit) => {
  const recent = new Map<string, ThreadView>()
  const mounted = sig<ThreadView[]>([])

  const drop = (id: string) => {
    recent.delete(id)
    mounted.update(views => views.filter(view => view.id !== id))
  }

  const get = (id: string) => {
    const view = recent.get(id) ?? threadView(id)
    if (!recent.has(id)) mounted.update(views => [...views, view])
    recent.delete(id)
    recent.set(id, view)
    for (const old of [...recent.keys()].slice(0, -kept)) drop(old)
    return view
  }

  const node = list(
    mounted,
    view => view.id,
    view => column(kit, untrack(() => view.get())),
  )

  return { node, get, drop, ids: () => [...recent.keys()] }
}
