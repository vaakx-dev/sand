import { collectScope, disposeAll, div, dockFade, list, sig, untrack, type Disposer, type Sig } from '@sand/dom'
import type { Row } from './rows'

export interface ThreadView {
  column: HTMLElement
  rows: Sig<Row[]>
  visible: Sig<boolean>
  scroll: number | undefined
  first: string | undefined
  truncated: boolean
  size: number
  painted: { done: boolean }
  scope: Disposer[]
}

const kept = 6

const build = () =>
  collectScope(() => {
    const rows = sig<Row[]>([])
    const visible = sig(false)
    const painted = { done: false }
    const rowNode = (row: Sig<Row>) => {
      const node = untrack(() => row.get()).view(row.map(value => value.data))
      return painted.done ? div({ class: 'animate-fade' }, node) : node
    }
    const column = div(
      { class: 'mx-auto w-full max-w-3xl px-3 pt-4 md:px-4', hidden: visible.map(value => !value) },
      list(rows, row => row.key, rowNode, div({ class: 'pb-6' })),
      dockFade(),
    )
    return { column, rows, visible, painted }
  })

export class Views {
  private views = new Map<string, ThreadView>()

  constructor(private parent: HTMLElement) {}

  get(id: string) {
    const view = this.views.get(id) ?? this.create()
    this.views.delete(id)
    this.views.set(id, view)
    while (this.views.size > kept) this.drop(this.views.keys().next().value!)
    return view
  }

  ids() {
    return [...this.views.keys()]
  }

  drop(id: string) {
    const view = this.views.get(id)
    if (!view) return
    view.column.remove()
    disposeAll(view.scope)
    this.views.delete(id)
  }

  clear() {
    for (const id of this.ids()) this.drop(id)
  }

  private create(): ThreadView {
    const { value, scope } = build()
    const view = { ...value, scope, scroll: undefined, first: undefined, truncated: false, size: 0 }
    this.parent.append(view.column)
    return view
  }
}
