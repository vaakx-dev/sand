import type { Entry } from '@sand/messages'
import type { Thread } from '@sand/web-client/contract'
import { batch, derive, effect, listbox, sig, untrack } from '@sand/dom'
import { toolAction } from '../tree/action'
import type { Filter } from '../tree/filter'
import { ancestors, nodesOf, type TreeNode } from '../tree/forest'
import { treeFrame, type TreeState } from '../tree/frame'
import { toggleFold } from '../tree/navigate'
import type { TreeItem } from './row'

export interface TreeSource {
  thread(): Thread | undefined
  jump(entry: Entry): void
  fork(entry: Entry): void
  label(session: string, target: string, text: string): Promise<void>
}

const fresh = { search: '', folded: new Set<string>() }

export const treeModel = (source: TreeSource) => {
  const state = sig<TreeState>({ selected: null, filter: 'conversation', ...fresh })
  const nodes = sig(new Map<string, TreeNode>())
  const head = sig<string | null>(null)
  const thread = sig<string | undefined>(undefined)
  const editing = sig<string | null>(null)
  let key = ''
  let editor: string | undefined

  const frame = derive(() => treeFrame(nodes.get(), head.get(), state.get()))
  const items = derive((): TreeItem[] => {
    const { rows, forest, index } = frame.get()
    const current = ancestors(nodes.get(), head.get()).find(id => forest.parent.has(id))
    return rows.flatMap((row, position) => {
      const tree = nodes.get().get(row.id)
      return tree ? [{ row, tree, active: forest.active.has(row.id), head: row.id === current, selected: position === index }] : []
    })
  })

  const update = (patch: Partial<TreeState>) => state.set({ ...state.get(), ...patch })
  const entry = (id: string | null | undefined) => (id ? nodes.get().get(id)?.entry : undefined)
  const rowId = (index: number) => frame.get().rows[index]?.id

  const jump = (id: string) => {
    const found = entry(id)
    if (found) source.jump(found)
  }

  const box = listbox({ count: () => frame.get().rows.length, choose: index => jump(rowId(index) ?? ''), wrap: true })

  effect(() => {
    const index = frame.get().index
    untrack(() => box.select(index))
  })
  effect(() => {
    const index = box.selected.get()
    untrack(() => {
      const id = rowId(index)
      if (id && id !== state.get().selected) update({ selected: id })
    })
  })

  const sync = () => {
    const current = source.thread()
    const next = current ? `${current.id}|${current.info.head}|${current.entries.size}` : ''
    if (current?.id !== thread.get()) {
      thread.set(current?.id)
      editing.set(null)
      update(fresh)
    }
    if (next === key) return
    key = next
    const moved = head.get() !== (current?.info.head ?? null)
    const found = current ? nodesOf([...current.entries.values()], toolAction) : new Map<string, TreeNode>()
    batch(() => {
      head.set(current?.info.head ?? null)
      nodes.set(found)
      const selected = state.get().selected
      if (moved || !selected || !found.has(selected)) update({ selected: current?.info.head ?? null })
    })
  }

  return {
    state,
    items,
    thread,
    editing,
    box,
    sync,
    jump,
    select: (id: string) => update({ selected: id }),
    fold: (id: string) => update(toggleFold(state.get(), id)),
    fork(id: string) {
      const found = entry(id)
      if (found) source.fork(found)
    },
    edit(id: string) {
      update({ selected: id })
      editor = thread.get()
      editing.set(id)
    },
    labelOf: (id: string) => untrack(() => nodes.get().get(id)?.label?.text ?? ''),
    async finish(id: string, value: string | undefined) {
      editing.set(null)
      if (value !== undefined && editor) await source.label(editor, id, value)
    },
    search: (search: string) => update({ search, folded: new Set() }),
    filter: (filter: Filter) => update({ filter, folded: new Set() }),
    clearSearch() {
      if (!state.get().search) return false
      update(fresh)
      return true
    },
    page: (rows: number, direction: 1 | -1) => box.select(box.selected.get() + direction * rows),
  }
}

export type TreeModel = ReturnType<typeof treeModel>
