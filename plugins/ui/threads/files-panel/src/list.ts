import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild } from '@vaakx-dev/vrui'
import type { FilesModel } from './model'
import { bar, failed, inset, page, pathLine } from './parts'
import { matchRows, treeRows } from './tree/rows'

const results = (kit: Kit, model: FilesModel) => {
  const state = derive(() => ({
    loaded: model.loaded.get(),
    changes: model.changes.get(),
    query: model.query.get().trim(),
    expanded: model.expanded.get(),
  }))
  return dynamicChild(state, ({ loaded, changes, query, expanded }) => {
    if (!loaded) return inset(kit.loadingState({ flush: true }))
    if ('error' in loaded) return inset(kit.errorState({ text: failed('load the files', loaded.error), retry: model.reload, flush: true }))
    const rows = { kit, listing: loaded.listing, changes, expanded, open: (path: string) => model.opened.set(path), toggle: model.toggle }
    return div({ class: 'px-2' }, ...(query ? matchRows(rows, query) : treeRows(rows, loaded.listing.tree)))
  })
}

export const listPage = (kit: Kit, model: FilesModel) => {
  const { emptyState, icon, iconButton, searchField } = kit
  return page(
    bar(
      kit,
      false,
      searchField({ placeholder: 'Filter files', 'aria-label': 'Filter files', bindValue: model.query }),
      iconButton({ title: 'Reload files', 'aria-label': 'Reload files', onClick: model.reload }, icon('reload', 16)),
    ),
    pathLine(() => model.place.get().cwd),
    dynamicChild(
      model.place.map(place => Boolean(place.cwd)),
      found => (found ? results(kit, model) : inset(emptyState({ text: 'This thread has no folder.', flush: true }))),
    ),
  )
}
