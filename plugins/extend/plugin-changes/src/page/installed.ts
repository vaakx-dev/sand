import type { InstalledPlugin } from '@sand/host-plugin-sync/contract'
import { derive, settingsRow, settingsSection, show, span, toggleSwitch, type Sig } from '@sand/dom'
import { plural } from '../plural'
import { noteRow, rows } from '../rows'
import type { PluginSource } from '../source'

const pluginRow = (source: PluginSource, plugin: Sig<InstalledPlugin>) => {
  const local = () => plugin.get().local
  return settingsRow(
    span({ class: 'truncate' }, () => plugin.get().name),
    [
      span({ class: 'text-xs text-neutral-500' }, 'This PC only'),
      toggleSwitch({
        on: local,
        'aria-label': 'This PC only',
        disabled: () => source.busy.get() !== undefined,
        onClick: () => void source.setLocal(plugin.get().name, !local()),
      }),
    ],
    () => (local() ? 'Not shared with your other PCs' : plural(plugin.get().files, 'file')),
  )
}

export const installedSection = (source: PluginSource) => {
  const plugins = derive(() => source.state.get()?.plugins ?? [])
  return settingsSection(
    { title: 'Sharing with your other PCs' },
    rows(plugins, plugin => plugin.name, plugin => pluginRow(source, plugin)),
    show(
      () => source.state.get() === undefined,
      () => noteRow('Loading…'),
    ),
    show(
      () => source.state.get()?.plugins.length === 0,
      () => noteRow('No plugins in ~/.sand/plugins yet.'),
    ),
  )
}
