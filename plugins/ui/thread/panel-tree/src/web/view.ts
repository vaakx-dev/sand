import type { Kit } from '@sand/ui-kit/contract'
import { div, dynamicChild, keys, list, media, show } from '@vaakx-dev/vrui'
import { filterNames, filters } from '../tree/filter'
import { rowsPerPage } from './integrations/page'
import { labelEditor } from './label-editor'
import { treeModel, type TreeSource } from './model'
import { rowView } from './row'

export const createTreeView = (kit: Kit, source: TreeSource) => {
  const { chipButton, contextMenu, hint, searchRow } = kit
  const model = treeModel(source)
  const fine = media('(pointer: fine)')
  const menu = contextMenu()

  const finish = async (id: string, value: string | undefined) => {
    await model.finish(id, value)
    if (fine.get()) root.focus()
  }

  let field: HTMLInputElement | undefined

  const search = searchRow({
    placeholder: 'Search the tree…',
    'aria-label': 'Search the tree',
    value: () => model.state.get().search,
    onInput: event => model.search((event.currentTarget as HTMLInputElement).value),
    onMount: node => {
      field = node
    },
  })

  const listView = list(
    model.items,
    item => item.row.id,
    item => rowView(kit, item, model, menu),
    div({ class: 'min-h-0 flex-1 overflow-auto px-2 pb-2', role: 'listbox' }),
  )

  const navigate = keys(
    {
      ...model.box.keyMap,
      PageDown: () => model.page(rowsPerPage(listView), 1),
      PageUp: () => model.page(rowsPerPage(listView), -1),
    },
    { stop: true },
  )

  const root = div(
    {
      class: 'flex h-full min-h-0 flex-col outline-none',
      tabIndex: -1,
      onKeyDown: event => {
        if (event.isComposing) return
        if (event.key !== 'Escape') return navigate(event)
        if (model.clearSearch()) event.preventDefault()
      },
    },
    search,
    div(
      { class: 'flex shrink-0 flex-wrap gap-1 px-2 pb-2' },
      filters.map(filter => chipButton({ active: () => model.state.get().filter === filter, onClick: () => model.filter(filter) }, filterNames[filter])),
    ),
    listView,
    show(
      model.items.map(rows => !rows.length),
      () => hint(() => (model.thread.get() ? 'No matches' : 'No thread selected')),
    ),
    dynamicChild(model.editing, id => (id ? labelEditor(kit, model.labelOf(id), value => void finish(id, value)) : null)),
    menu.view(),
  )

  model.sync()

  return {
    root,
    sync: model.sync,
    focus: () => (fine.get() && field ? field.focus() : root.focus()),
  }
}

export type TreeView = ReturnType<typeof createTreeView>
