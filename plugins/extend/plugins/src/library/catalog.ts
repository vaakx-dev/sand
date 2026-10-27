import type { PluginEntry } from '@sand/host-plugin-library/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild, list, show, type Sig } from '@vaakx-dev/vrui'
import { type AreaGroup, pluginFilter, type PluginFilter } from './filter'
import { pluginRow, type RowActions } from './row'
import type { LibrarySource } from './source'

const rowKey = (plugin: PluginEntry) => JSON.stringify(plugin)

const areaSection = (kit: Kit, group: Sig<AreaGroup>, actions: RowActions) => {
  const { rowList, settingsSection } = kit
  return settingsSection(
    { title: () => group.get().title },
    rowList(
      derive(() => group.get().plugins),
      plugin => plugin.name,
      plugin => dynamicChild(plugin.map(rowKey), () => pluginRow(kit, plugin.get(), actions)),
    ),
  )
}

const toolbar = ({ searchField, segmented }: Kit, filter: PluginFilter) =>
  div(
    { class: 'flex flex-wrap items-center gap-3' },
    div(
      { class: 'flex min-w-48 flex-1' },
      searchField({ placeholder: 'Search plugins', 'aria-label': 'Search plugins', bindValue: filter.query }),
    ),
    dynamicChild(filter.choices, choices => (choices.length ? segmented(choices, filter.active, value => filter.origin.set(value), { label: 'Show' }) : null)),
  )

export const catalogSection = (kit: Kit, source: LibrarySource, actions: RowActions) => {
  const { emptyState, loadingState, quietButton } = kit
  const filter = pluginFilter(source, kit)
  return div(
    { class: 'flex flex-col gap-4' },
    toolbar(kit, filter),
    list(filter.groups, group => group.area, group => areaSection(kit, group, actions), div({ class: 'flex flex-col gap-6' })),
    show(filter.loading, () => loadingState()),
    show(
      () => !filter.loading.get() && filter.groups.get().length === 0,
      () => emptyState({ text: 'No plugins match your search', action: quietButton({ size: 'sm', onClick: filter.clear }, 'Clear search') }),
    ),
  )
}
