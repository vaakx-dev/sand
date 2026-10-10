import type { PairedDevice } from '@sand/host-devices/contract'
import type { MenuSpec } from '@sand/dom'
import type { DeviceSource } from '../source'

const cleaned = (text: string) => text.replace(/\s+/g, ' ').trim()

export const phoneMenu = (source: DeviceSource, device: PairedDevice, self: boolean): MenuSpec => ({
  title: device.name,
  subtitle: self ? 'This browser' : device.kind === 'phone' ? 'Phone' : 'Browser',
  actions: [
    {
      id: 'rename',
      label: 'Rename…',
      icon: 'pencil',
      group: 'name',
      ask: {
        placeholder: device.name,
        tip: 'New device name',
        submit: 'Rename',
        preview: text => (cleaned(text) && cleaned(text) !== device.name ? `Rename to ${cleaned(text)}` : undefined),
        run: text => source.rename(device.id, cleaned(text)).catch(source.fail),
      },
      run: () => {},
    },
    {
      id: 'remove',
      label: 'Remove',
      icon: 'trash',
      group: 'remove',
      danger: true,
      confirm: self ? 'This is the browser you are using. Removing it unpairs it.' : undefined,
      run: () => source.remove(device.id).catch(source.fail),
    },
  ],
})
