import type { PluginEntry } from '@sand/host-plugin-library/contract'
import { derive, div, dynamicChild, hint, list, p, segmented, settingsSection, show, textInput, type Sig } from '@sand/dom'
import type { LibrarySource } from '../../library/source'
import { type AreaGroup, pluginFilter, type PluginFilter } from './filter'
import { pluginRow } from './row'
import type { RowActions } from './warning'

const rowKey = (plugin: PluginEntry) => JSON.stringify(plugin)

const areaSection = (group: Sig<AreaGroup>, actions: RowActions) =>
  settingsSection(
    { title: () => group.get().title },
    list(
      derive(() => group.get().plugins),
      plugin => plugin.name,
      plugin => dynamicChild(plugin.map(rowKey), () => pluginRow(plugin.get(), actions)),
      div({ class: 'contents' }),
    ),
  )

const toolbar = (filter: PluginFilter) =>
  div(
    { class: 'flex flex-wrap items-center gap-3' },
    div(
      { class: 'flex min-w-48 flex-1' },
      textInput({ type: 'search', placeholder: 'Search plugins', 'aria-label': 'Search plugins', bindValue: filter.query }),
    ),
    dynamicChild(filter.choices, choices => segmented(choices, filter.origin, value => filter.origin.set(value), { label: 'Show' })),
  )

export const catalogSection = (source: LibrarySource, actions: RowActions) => {
  const filter = pluginFilter(source)
  return div(
    { class: 'flex flex-col gap-4' },
    toolbar(filter),
    p({ class: 'px-1 text-xs text-neutral-500' }, 'Customise copies a built-in into ~/.sand/plugins, where your copy replaces it. Changes take effect after /reload.'),
    list(filter.groups, group => group.area, group => areaSection(group, actions), div({ class: 'flex flex-col gap-6' })),
    show(filter.loading, () => settingsSection({}, div({ class: 'bg-neutral-900' }, hint('Loading…')))),
    show(
      derive(() => !filter.loading.get() && filter.groups.get().length === 0),
      () => settingsSection({}, div({ class: 'bg-neutral-900' }, hint('No plugins match.'))),
    ),
  )
}
