import { contextMenu, div, dynamicChild, finePointer, hint, keys, list, quietButton, show, textInput } from '@sand/dom'
import { filterNames, filters } from '../tree/filter'
import { rowsPerPage } from './integrations/page'
import { labelEditor } from './label-input'
import { treeModel, type TreeSource } from './model'
import { rowView, type RowActions } from './row'

export const createTreeView = (source: TreeSource) => {
  const model = treeModel(source)
  const fine = finePointer()

  const actions: RowActions = {
    select: model.select,
    jump: model.jump,
    fold: model.fold,
    label: model.edit,
    fork: model.fork,
    setLabel: model.setLabel,
  }
  const menu = contextMenu()

  const finish = async (id: string, value: string | undefined) => {
    await model.finish(id, value)
    if (fine.get()) root.focus()
  }

  const search = textInput({
    type: 'search',
    placeholder: 'Search the tree…',
    value: () => model.state.get().search,
    onInput: () => model.search(search.value),
  })

  const listView = list(
    model.items,
    item => item.row.id,
    item => rowView(item, actions, menu),
    div({ class: 'min-h-0 flex-1 overflow-auto pb-2', role: 'listbox' }),
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
    div(
      { class: 'flex shrink-0 flex-col gap-2 px-3 pt-2 pb-2' },
      search,
      div(
        { class: 'flex flex-wrap gap-1' },
        filters.map(filter => quietButton({ size: 'sm', active: () => model.state.get().filter === filter, onClick: () => model.filter(filter) }, filterNames[filter])),
      ),
    ),
    listView,
    show(
      model.items.map(rows => !rows.length),
      () => hint(() => (model.thread.get() ? 'No entries match.' : 'No thread selected.')),
    ),
    dynamicChild(model.editing, id => (id ? labelEditor(model.labelOf(id), value => void finish(id, value)) : div({ class: 'hidden' }))),
    menu.view(),
  )

  model.sync()

  return {
    root,
    sync: model.sync,
    focus: () => (fine.get() ? search.focus() : root.focus()),
  }
}

export type TreeView = ReturnType<typeof createTreeView>
