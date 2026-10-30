import type { DeviceRecord } from '@sand/devices-contract'
import { picker } from '@sand/picker/contract'
import { oneLine } from '@sand/util'
import type { Ui } from '../ui'

export const canRename = (ui: Ui) => Boolean(ui.ctx.get(picker))

export const renameDevice = async (ui: Ui, device: DeviceRecord) => {
  const input = ui.ctx.get(picker)
  if (!input) return
  const name = oneLine((await input.input('Rename device', device.name)) ?? '')
  if (name && name !== device.name) await ui.toasts.attempt(`Couldn’t rename ${device.name}`, ui.data.devices.rename(device.id, name))
}
