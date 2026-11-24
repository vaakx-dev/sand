import { DEFAULT_UPDATE_CHANNEL, type UpdateChannel } from '@sand/host-updates/contract'
import { settingMark, type SettingsItem } from '@sand/settings/contract'
import type { Kit } from '@sand/ui-kit/contract'
import type { Fleet } from '../fleet/model'
import { isBusy } from '../fleet/status'

const channels: { value: UpdateChannel; label: string }[] = [
  { value: 'release', label: 'Releases (default)' },
  { value: 'nightly', label: 'Nightly' },
  { value: 'dev', label: 'Dev' },
]

const channelItem: SettingsItem = { id: 'channel', label: 'Release channel', keywords: ['updates from', 'stable', 'beta', 'nightly', 'dev', 'releases'] }

const channelSection = (kit: Kit, fleet: Fleet) => {
  const { segmented, settingsRow, settingsSection } = kit
  const locked = () => fleet.busy.get() || !fleet.channel.get() || fleet.pcs.get().some(pc => isBusy(pc.state))
  const choose = (channel: UpdateChannel) => {
    if (!locked() && channel !== fleet.channel.get()) void fleet.setChannel(channel)
  }
  const reset = { changed: () => !locked() && fleet.channel.get() !== DEFAULT_UPDATE_CHANNEL, run: () => choose(DEFAULT_UPDATE_CHANNEL) }
  return settingsSection(
    {},
    settingsRow({ ...settingMark(channelItem.id), title: 'Updates from', reset }, segmented(channels, fleet.channel, choose, { label: 'Updates from' })),
  )
}

export { channelItem, channelSection }
