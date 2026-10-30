import { type Child, derive, div, dynamicChild, effect, untrack } from '@vaakx-dev/vrui'
import { pcSettings } from '../data/pc-settings'
import { anywhereRows } from '../switches/anywhere'
import { networkRows } from '../switches/network'
import type { Ui } from '../ui'

export const pcSwitches = (ui: Ui, pc: string) => {
  const { emptyState, settingsSection } = ui.kit
  const name = () => ui.data.nameOf(pc)
  const view = ui.data.view(pc)
  const online = derive(() => view.get()?.online ?? false)
  const settings = pc === ui.data.homeId() ? ui.data.home : pcSettings(ui.ctx, pc)
  effect(() => {
    if (online.get()) untrack(() => void settings.refresh())
  })
  const whenOnline = (rows: () => Child[]) =>
    dynamicChild(online, on => (on ? div({ class: 'contents' }, ...rows()) : emptyState({ surface: 'group', text: `Connect to ${name()} to change this.` })))
  return [
    settingsSection({ title: 'Reach from anywhere' }, whenOnline(() => anywhereRows(ui, settings, name))),
    settingsSection({ title: 'Network' }, whenOnline(() => networkRows(ui, settings, name))),
  ]
}
