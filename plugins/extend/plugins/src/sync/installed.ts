import type { InstalledPlugin } from '@sand/host-plugin-sync/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { plural } from '@sand/util'
import { derive, show, span, type Sig } from '@vaakx-dev/vrui'
import type { SyncSource } from './source'

const pluginRow = ({ settingsRow, toggleSwitch }: Kit, source: SyncSource, plugin: Sig<InstalledPlugin>) => {
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

export const installedSection = (kit: Kit, source: SyncSource) => {
  const { hintRow, rowList, settingsSection } = kit
  const plugins = derive(() => source.state.get()?.plugins ?? [])
  return settingsSection(
    { title: 'Sharing with your other PCs' },
    rowList(plugins, plugin => plugin.name, plugin => pluginRow(kit, source, plugin)),
    show(
      () => source.state.get() === undefined,
      () => hintRow('Loading…'),
    ),
    show(
      () => source.state.get()?.plugins.length === 0,
      () => hintRow('No plugins in ~/.sand/plugins yet'),
    ),
  )
}
