import { anywhereRows } from '../switches/anywhere'
import { networkRows } from '../switches/network'
import type { Ui } from '../ui'

export const thisPcSections = (ui: Ui) => {
  const { settingsSection } = ui.kit
  const name = () => ui.data.nameOf(ui.data.homeId())
  return [
    settingsSection({ title: 'Reach from anywhere' }, ...anywhereRows(ui, ui.data.home, name)),
    settingsSection({ title: 'Network' }, ...networkRows(ui, ui.data.home, name)),
  ]
}
