import type { InstalledPlugin } from '@sand/host-plugin-sync/contract'
import { derive, div, hint, list, settingsRow, settingsSection, show, span, toggleSwitch, type Sig } from '@sand/dom'
import type { PluginSource } from '../source'

export const fileCount = (count: number) => `${count} file${count === 1 ? '' : 's'}`

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
    () => (local() ? 'Not shared with your other PCs' : fileCount(plugin.get().files)),
  )
}

const notice = (text: string) => div({ class: 'bg-neutral-900' }, hint(text))

export const installedSection = (source: PluginSource) => {
  const plugins = derive(() => source.state.get()?.plugins ?? [])
  return settingsSection(
    { title: 'Sharing with your other PCs' },
    list(plugins, plugin => plugin.name, plugin => pluginRow(source, plugin), div({ class: 'contents' })),
    show(
      source.state.map(state => state === undefined),
      () => notice('Loading…'),
    ),
    show(
      source.state.map(state => state?.plugins.length === 0),
      () => notice('No plugins in ~/.sand/plugins yet.'),
    ),
  )
}
