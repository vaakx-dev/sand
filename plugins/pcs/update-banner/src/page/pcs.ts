import type { Kit } from '@sand/ui-kit/contract'
import { dynamicChild, type Sig } from '@vaakx-dev/vrui'
import { actionButton, fleetAction, pcActionKind } from '../actions'
import type { Fleet, PcView } from '../fleet/model'
import { channelNames, versionText } from '../fleet/text'
import { pcStatusLine } from '../pc-line'
import { pcMenu } from './pc-menu'

const channelButton = (kit: Kit, fleet: Fleet) => {
  const { secondaryAction } = kit
  const channel = fleet.channel.get()
  if (!channel) return null
  return secondaryAction({ size: 'sm', disabled: fleet.busy, onClick: () => void fleet.setChannel(channel) }, `Use ${channelNames[channel]}`)
}

const controlKind = (pc: PcView) => (pc.status.kind === 'channel' ? 'channel' : pcActionKind(pc))

const pcRow = (kit: Kit, row: Sig<PcView>, fleet: Fleet) => {
  const { contextMenu, settingsRow } = kit
  const menu = contextMenu()
  const control = (kind: ReturnType<typeof controlKind>) => {
    if (kind === 'channel') return channelButton(kit, fleet)
    return kind ? actionButton(kit, fleetAction(fleet, row.get().key, kind)) : null
  }
  return settingsRow(
    {
      ...menu.target(() => pcMenu(row.get(), fleet)),
      title: () => row.get().name,
      detail: pcStatusLine(kit, row, fleet, () => versionText(row.get().state?.current, fleet.target.get())),
    },
    dynamicChild(row.map(controlKind), control),
    menu.view(),
  )
}

export const pcsSection = (kit: Kit, fleet: Fleet) => {
  const { rowList, settingsSection } = kit
  return settingsSection({ title: 'PCs' }, rowList(fleet.pcs, pc => pc.key, row => pcRow(kit, row, fleet)))
}
