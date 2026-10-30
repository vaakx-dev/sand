import type { DeviceRecord } from '@sand/devices-contract'
import { derive, dynamicChild, show } from '@vaakx-dev/vrui'
import type { Ui } from '../../ui'
import { phoneRow } from './row'

const selfFirst = (self: string | undefined) => (a: DeviceRecord, b: DeviceRecord) => Number(b.id === self) - Number(a.id === self) || b.updated - a.updated

export const phonesSection = (ui: Ui) => {
  const { emptyState, errorState, icon, loadingState, quietButton, rowList, settingsSection } = ui.kit
  const { devices } = ui.data
  const list = derive(() =>
    devices
      .live()
      .filter(device => device.kind !== 'pc')
      .sort(selfFirst(ui.ctx.pcs.self())),
  )
  return settingsSection(
    { title: 'Phones and browsers', action: quietButton({ size: 'sm', onClick: () => ui.open.add('phone') }, icon('plus', 'sm'), 'Add a phone or browser') },
    show(
      () => !devices.records.loaded.get() && !devices.records.error.get(),
      () => loadingState({ surface: 'group' }),
    ),
    rowList(list, device => device.id, device => phoneRow(ui, device)),
    show(
      () => devices.records.loaded.get() && !list.get().length,
      () => emptyState({ surface: 'group', text: 'No phones or browsers yet.' }),
    ),
    dynamicChild(devices.records.error, error =>
      error ? errorState({ surface: 'group', text: `Couldn’t load your devices: ${error}`, retry: () => void devices.refresh() }) : null,
    ),
    dynamicChild(devices.seen.error, error =>
      error ? errorState({ surface: 'group', text: `Couldn’t tell which devices are connected: ${error}`, retry: () => void devices.seen.refresh() }) : null,
    ),
  )
}
