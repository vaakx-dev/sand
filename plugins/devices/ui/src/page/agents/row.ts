import type { AgentAccess, DeviceRecord } from '@sand/devices-contract'
import { span, type Sig } from '@vaakx-dev/vrui'
import { removeButton } from '../../shared/remove-button'
import { toneDot } from '../../status/dot'
import type { Ui } from '../../ui'

const accessWords: Record<AgentAccess, string> = { read: 'Reads threads', operate: 'Starts and messages threads' }

const remove = (ui: Ui, device: DeviceRecord) => void ui.toasts.attempt(`Couldn’t remove ${device.name}`, ui.data.devices.remove(device.id))

export const agentRow = (ui: Ui, device: Sig<DeviceRecord>) => {
  const { icon, settingsRow, statusLine } = ui.kit
  const working = () => Boolean(ui.data.devices.seenOf(device.get().id)?.online)
  const words = () => {
    const { agent } = device.get()
    return [agent && accessWords[agent.access], working() && 'Working now'].filter(Boolean).join(' · ')
  }
  return settingsRow(
    {
      lead: span({ class: 'inline-flex text-neutral-400' }, icon('bot', 'md')),
      title: span({ class: 'min-w-0 truncate' }, () => device.get().name),
      detail: statusLine({ mark: toneDot(ui.kit, () => (working() ? 'ok' : 'off'), words), text: words, title: words }),
    },
    removeButton(ui.kit, 'Remove', () => remove(ui, device.get())),
  )
}
