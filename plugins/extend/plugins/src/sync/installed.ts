import type { InstalledPlugin } from '@sand/host-plugin-sync/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { plural } from '@sand/util'
import { derive, show, type Sig } from '@vaakx-dev/vrui'
import type { SyncSource } from './source'

const pluginRow = ({ settingsRow, toggleSwitch }: Kit, source: SyncSource, plugin: Sig<InstalledPlugin>) => {
  const shared = () => !plugin.get().local
  return settingsRow(
    { title: () => plugin.get().name, detail: () => (shared() ? plural(plugin.get().files, 'file') : 'Only on this PC') },
    toggleSwitch({
      on: shared,
      'aria-label': () => `Share ${plugin.get().name} with your other PCs`,
      disabled: () => source.busy.get() !== undefined,
      onClick: () => void source.setLocal(plugin.get().name, shared()),
    }),
  )
}

export const installedSection = (kit: Kit, source: SyncSource) => {
  const { emptyState, loadingState, rowList, settingsSection } = kit
  const plugins = derive(() => source.state.get()?.plugins ?? [])
  return settingsSection(
    { title: 'Sharing with your other PCs' },
    rowList(plugins, plugin => plugin.name, plugin => pluginRow(kit, source, plugin)),
    show(
      () => source.state.get() === undefined,
      () => loadingState({ surface: 'group' }),
    ),
    show(
      () => source.state.get()?.plugins.length === 0,
      () => emptyState({ surface: 'group', text: 'Plugins you customise or add are shared with your other PCs' }),
    ),
  )
}
