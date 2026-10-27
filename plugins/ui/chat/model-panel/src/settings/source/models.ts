import type { SourceInfo } from '@sand/accounts/contract'
import type { Choice, Kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild, show } from '@vaakx-dev/vrui'
import { addRow } from './add'
import type { Catalog } from './catalog'
import type { Filter, Mode } from './filter'
import { modelRow } from './row'

const toolbar = (kit: Kit, catalog: Catalog, filter: Filter) => {
  const { searchField, segmented } = kit
  const total = derive(() => catalog.models.get()?.length ?? 0)
  const shown = derive(() => catalog.models.get()?.filter(model => !model.hidden).length ?? 0)
  const choices = (): Choice<Mode>[] => [
    { value: 'shown', label: `Shown ${shown.get()}` },
    { value: 'all', label: `All ${total.get()}` },
  ]
  return div(
    { class: 'flex flex-wrap items-center gap-2' },
    div(
      { class: 'flex min-w-48 flex-1' },
      searchField({
        placeholder: () => (total.get() ? `Search ${total.get()} models` : 'Search models'),
        'aria-label': 'Search models',
        bindValue: filter.query,
      }),
    ),
    dynamicChild(
      derive(() => `${shown.get()} ${total.get()}`),
      () => segmented(choices(), filter.mode, mode => filter.mode.set(mode), { label: 'Which models' }),
    ),
  )
}

const emptyText = (catalog: Catalog, filter: Filter) => {
  if (filter.query.get().trim()) return 'No matches.'
  if (filter.mode.get() === 'shown' && catalog.models.get()?.length) return 'None shown yet. Pick some under All.'
  return 'No models yet.'
}

type Status = 'error' | 'loading' | 'rows' | 'empty'

const statusOf = (catalog: Catalog, filter: Filter): Status => {
  if (!catalog.models.get()) return catalog.error.get() ? 'error' : 'loading'
  return filter.found.get().length ? 'rows' : 'empty'
}

const status = ({ emptyState, errorState, loadingState }: Kit, catalog: Catalog, filter: Filter) =>
  dynamicChild(
    derive(() => statusOf(catalog, filter)),
    state => {
      if (state === 'error') return errorState({ surface: 'group', text: () => catalog.error.get(), retry: () => void catalog.reload() })
      if (state === 'rows') return null
      if (state === 'loading') return loadingState({ surface: 'group' })
      return emptyState({ surface: 'group', text: () => emptyText(catalog, filter) })
    },
  )

export const modelsSection = (kit: Kit, source: SourceInfo, catalog: Catalog, filter: Filter) => {
  const { listRow, rowList, settingsSection } = kit
  return div(
    { class: 'flex flex-col gap-2' },
    source.search ? toolbar(kit, catalog, filter) : null,
    settingsSection(
      {},
      status(kit, catalog, filter),
      rowList(filter.rows, model => model.id, row => modelRow(kit, row, catalog, filter.keep)),
      show(
        filter.more.map(more => more > 0),
        () => listRow({ surface: 'group', title: () => `Show ${filter.more.get()} more`, onClick: filter.showMore }),
      ),
      source.slugs ? addRow(kit, catalog, model => filter.keep(model.id)) : null,
    ),
  )
}
