import type { DeviceRecord } from '@sand/devices-contract'
import { span, type Sig } from '@vaakx-dev/vrui'
import { kindIcon } from '../../requests/words'
import { removeButton } from '../../shared/remove-button'
import { canRename, renameDevice } from '../../shared/rename'
import { agoWords } from '../../shared/time'
import { toneDot } from '../../status/dot'
import type { Ui } from '../../ui'

const reachWords = (device: DeviceRecord) => {
  if (device.kind !== 'phone') return undefined
  return device.keys.some(key => key.origin?.startsWith('https:')) ? 'works at home and away' : 'home wifi only'
}

const seenWords = (ui: Ui, device: DeviceRecord, self: boolean) => {
  const seen = ui.data.devices.seenOf(device.id)
  if (self || seen?.online) return { online: true, text: 'Connected now' }
  return { online: false, text: seen ? `Last seen ${agoWords(seen.at, ui.data.now.get())}` : 'Not connected' }
}

const remove = (ui: Ui, device: DeviceRecord) => void ui.toasts.attempt(`Couldn’t remove ${device.name}`, ui.data.devices.remove(device.id))

export const phoneRow = (ui: Ui, device: Sig<DeviceRecord>) => {
  const { badge, icon, iconButton, settingsRow, statusLine } = ui.kit
  const self = device.get().id === ui.ctx.pcs.self()
  const status = () => seenWords(ui, device.get(), self)
  const words = () => [status().text, reachWords(device.get())].filter(Boolean).join(' · ')
  return settingsRow(
    {
      lead: span({ class: 'inline-flex text-neutral-400' }, icon(kindIcon(device.get().kind), 'md')),
      title: span({ class: 'flex min-w-0 items-center gap-2' }, span({ class: 'min-w-0 truncate' }, () => device.get().name), self ? badge('accent', ui.device()) : null),
      detail: statusLine({ mark: toneDot(ui.kit, () => (status().online ? 'ok' : 'off'), words), text: words, title: words }),
    },
    canRename(ui) ? iconButton({ size: 'sm', surface: 'group', title: 'Rename', 'aria-label': 'Rename', onClick: () => void renameDevice(ui, device.get()) }, icon('pencil', 'sm')) : null,
    removeButton(ui.kit, 'Remove', () => remove(ui, device.get())),
  )
}
