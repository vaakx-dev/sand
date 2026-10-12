import { contextMenu, dynamicChild, icon, itemRow, rowList, secondaryAction, settingsSection, tile, type Sig } from '@sand/dom'
import { actionButton, fleetAction, pcActionKind } from '../actions'
import type { Fleet, PcView } from '../fleet/model'
import { channelNames, versionText } from '../fleet/text'
import { pcStatusLine } from '../pc-line'
import { pcMenu } from './pc-menu'

const channelButton = (fleet: Fleet) => {
  const channel = fleet.channel.get()
  if (!channel) return null
  return secondaryAction({ size: 'sm', disabled: fleet.busy, onClick: () => void fleet.setChannel(channel) }, `Use ${channelNames[channel]}`)
}

const controlKind = (pc: PcView) => (pc.status.kind === 'channel' ? 'channel' : pcActionKind(pc))

const pcRow = (row: Sig<PcView>, fleet: Fleet) => {
  const menu = contextMenu()
  const control = (kind: ReturnType<typeof controlKind>) => {
    if (kind === 'channel') return channelButton(fleet)
    return kind ? actionButton(fleetAction(fleet, row.get().key, kind)) : null
  }
  return itemRow(
    menu.target(() => pcMenu(row.get(), fleet)),
    tile(icon('laptop', 16)),
    () => row.get().name,
    pcStatusLine(row, fleet, () => versionText(row.get().state?.current, fleet.target.get())),
    dynamicChild(row.map(controlKind), control),
    menu.view(),
  )
}

export const pcsSection = (fleet: Fleet) =>
  settingsSection({ title: 'PCs' }, rowList(fleet.pcs, pc => pc.key, row => pcRow(row, fleet)))
