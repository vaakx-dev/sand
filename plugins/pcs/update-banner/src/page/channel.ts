import type { UpdateChannel } from '@sand/host-updates/contract'
import { segmented, settingsRow, settingsSection } from '@sand/dom'
import type { Fleet } from '../fleet/model'
import { isBusy } from '../fleet/status'

const channels: { value: UpdateChannel; label: string; detail: string }[] = [
  { value: 'release', label: 'Releases', detail: 'Tested releases only.' },
  { value: 'nightly', label: 'Nightly', detail: 'The newest build once a day. Nightly builds may break.' },
  { value: 'dev', label: 'Dev', detail: 'A build for every change pushed to sand. Dev builds break more often.' },
]

const channelDetail = (channel: UpdateChannel | undefined) => {
  const detail = channels.find(choice => choice.value === channel)?.detail
  return detail ? `${detail} Every PC uses this.` : 'Every PC uses this.'
}

export const channelSection = (fleet: Fleet) => {
  const locked = () => fleet.busy.get() || !fleet.channel.get() || fleet.pcs.get().some(pc => isBusy(pc.state))
  const choose = (channel: UpdateChannel) => {
    if (!locked() && channel !== fleet.channel.get()) void fleet.setChannel(channel)
  }
  return settingsSection(
    {},
    settingsRow(
      'Updates from',
      segmented(channels, fleet.channel, choose, { label: 'Updates from', inset: true }),
      () => channelDetail(fleet.channel.get()),
    ),
  )
}
