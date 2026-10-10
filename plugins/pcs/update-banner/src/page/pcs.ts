import { div, dynamicChild, icon, list, secondaryAction, settingsSection, span, tile, type Sig } from '@sand/dom'
import type { Fleet, PcView } from '../fleet/model'
import { channelNames, versionText } from '../fleet/text'
import { pcStatusLine } from '../pc-line'

const actionKey = (pc: PcView) => {
  const { status } = pc
  if (status.kind === 'busy') return status.phase === 'waiting' && pc.state?.running ? 'restart' : ''
  if (status.kind === 'behind' || status.kind === 'failed' || status.kind === 'channel') return status.kind
  return ''
}

const action = (row: Sig<PcView>, fleet: Fleet, kind: string) => {
  const key = row.get().key
  const channel = fleet.channel.get()
  switch (kind) {
    case 'behind':
      return secondaryAction({ size: 'sm', onClick: () => void fleet.update([key]) }, 'Update')
    case 'failed':
      return secondaryAction({ size: 'sm', onClick: () => fleet.retry(key) }, 'Try again')
    case 'channel':
      return channel
        ? secondaryAction({ size: 'sm', disabled: fleet.busy, onClick: () => void fleet.setChannel(channel) }, `Use ${channelNames[channel]}`)
        : span()
    case 'restart':
      return secondaryAction({ size: 'sm', onClick: () => void fleet.restartNow(key) }, 'Restart now')
    default:
      return span()
  }
}

const pcRow = (row: Sig<PcView>, fleet: Fleet) =>
  div(
    { class: 'flex min-h-12 items-center gap-3 bg-neutral-900 px-4 py-3' },
    tile(icon('laptop', 16)),
    div(
      { class: 'flex min-w-0 flex-1 flex-col' },
      span({ class: 'truncate text-sm font-medium text-neutral-100' }, () => row.get().name),
      pcStatusLine(row, fleet, () => versionText(row.get().state?.current, fleet.target.get())),
    ),
    dynamicChild(row.map(actionKey), kind => action(row, fleet, kind)),
  )

export const pcsSection = (fleet: Fleet) =>
  settingsSection({ title: 'PCs' }, list(fleet.pcs, pc => pc.key, row => pcRow(row, fleet), div({ class: 'contents' })))
