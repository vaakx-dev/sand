import type { DeviceRecord } from '@sand/devices-contract'
import { derive, show, span, type Sig } from '@vaakx-dev/vrui'
import { requestRow } from '../requests/row'
import { kindIcon } from '../requests/words'
import { canRename, renameDevice } from '../shared/rename'
import type { Ui } from '../ui'

const joinedRow = (ui: Ui, device: Sig<DeviceRecord>) => {
  const { icon, quietButton, settingsRow } = ui.kit
  return settingsRow(
    {
      lead: span({ class: 'inline-flex text-neutral-400' }, icon(kindIcon(device.get().kind, device.get().platform), 'md')),
      title: () => ui.data.devices.get(device.get().id)?.name ?? device.get().name,
      detail: span({ class: 'inline-flex items-center gap-1.5 text-success-400' }, icon('check', 'xs'), 'Joined'),
    },
    canRename(ui) ? quietButton({ size: 'sm', surface: 'group', onClick: () => void renameDevice(ui, device.get()) }, 'Rename…') : null,
  )
}

export const askingSection = (ui: Ui, joined: Sig<DeviceRecord[]>) => {
  const { rowList, settingsSection } = ui.kit
  const pending = derive(() => ui.data.requests.live(ui.data.now.get()))
  const allowed = (device: DeviceRecord) => joined.update(all => [...all, device])
  return show(
    () => pending.get().length > 0 || joined.get().length > 0,
    () =>
      settingsSection(
        { title: 'Asking to join' },
        rowList(joined, device => device.id, device => joinedRow(ui, device)),
        rowList(pending, request => request.id, request => requestRow(ui, request, { compact: true, allowed })),
      ),
  )
}
