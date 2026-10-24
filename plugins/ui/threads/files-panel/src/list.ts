import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild } from '@vaakx-dev/vrui'
import type { FilesModel } from './model'
import { bar, page, pathLine } from './parts'
import { matchRows, treeRows } from './tree/rows'

const results = (kit: Kit, model: FilesModel) => {
  const state = derive(() => ({ loaded: model.loaded.get(), query: model.query.get().trim(), expanded: model.expanded.get() }))
  return dynamicChild(state, ({ loaded, query, expanded }) => {
    if (!loaded) return kit.hint('Loading files…')
    if ('error' in loaded) return kit.hint(loaded.error)
    const rows = { kit, listing: loaded.listing, expanded, open: (path: string) => model.opened.set(path), toggle: model.toggle }
    return div(...(query ? matchRows(rows, query) : treeRows(rows, loaded.listing.tree)))
  })
}

export const listPage = (kit: Kit, model: FilesModel) => {
  const { hint, icon, iconButton, searchField } = kit
  return page(
    bar(
      searchField({ placeholder: 'Filter files', 'aria-label': 'Filter files', bindValue: model.query }),
      iconButton({ title: 'Reload files', onClick: model.reload }, icon('reload', 16)),
    ),
    pathLine(() => model.place.get().cwd),
    dynamicChild(
      model.place.map(place => Boolean(place.cwd)),
      found => (found ? results(kit, model) : hint('This thread has no folder')),
    ),
  )
}
