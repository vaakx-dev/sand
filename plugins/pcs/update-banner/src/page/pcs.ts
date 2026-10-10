import { contextMenu, div, dynamicChild, icon, list, secondaryAction, settingsSection, span, tile, type Sig } from '@sand/dom'
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
  return div(
    { class: 'flex min-h-12 items-center gap-3 bg-neutral-900 px-4 py-3', ...menu.target(() => pcMenu(row.get(), fleet)) },
    menu.view(),
    tile(icon('laptop', 16)),
    div(
      { class: 'flex min-w-0 flex-1 flex-col' },
      span({ class: 'truncate text-sm font-medium text-neutral-100' }, () => row.get().name),
      pcStatusLine(row, fleet, () => versionText(row.get().state?.current, fleet.target.get())),
    ),
    dynamicChild(row.map(controlKind), control),
  )
}

export const pcsSection = (fleet: Fleet) =>
  settingsSection({ title: 'PCs' }, list(fleet.pcs, pc => pc.key, row => pcRow(row, fleet), div({ class: 'contents' })))
