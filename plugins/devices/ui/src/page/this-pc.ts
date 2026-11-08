import { show } from '@vaakx-dev/vrui'
import { anywhereRows } from '../switches/anywhere'
import { networkRows } from '../switches/network'
import type { Ui } from '../ui'

export const thisPcSections = (ui: Ui) => {
  const { settingsSection } = ui.kit
  const name = () => ui.data.nameOf(ui.data.homeId())
  return [
    show(
      () => !ui.data.home.tailscale.missing.get(),
      () => settingsSection({ title: 'Reach from anywhere' }, ...anywhereRows(ui, ui.data.home, name, 'page')),
    ),
    show(
      () => !ui.data.home.network.missing.get(),
      () => settingsSection({ title: 'Network' }, ...networkRows(ui, ui.data.home, name)),
    ),
  ]
}
