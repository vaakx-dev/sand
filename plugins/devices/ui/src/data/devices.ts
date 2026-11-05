import {
  type AgentAccess,
  type DeviceRecord,
  type DeviceSeen,
  devicesChange,
  devicesIcon,
  devicesList,
  devicesRemove,
  devicesRename,
  devicesSeen,
  type PcIcon,
  pairAgent,
} from '@sand/devices-contract'
import type { UiContext } from '../inject'
import { feed } from './feed'

export const devicesData = (ctx: UiContext) => {
  const records = feed(() => ctx.wire.call(devicesList, {}), [] as DeviceRecord[])
  const seen = feed(() => ctx.wire.call(devicesSeen, {}), [] as DeviceSeen[])

  ctx.effect(() =>
    ctx.wire.on(devicesChange, list => {
      records.value.set(list)
      void seen.refresh()
    }),
  )

  const live = () => records.value.get().filter(record => !record.removed)

  return {
    records,
    seen,
    live,
    get: (id: string) => records.value.get().find(record => record.id === id),
    nameOf: (id: string) => records.value.get().find(record => record.id === id)?.name,
    seenOf: (id: string) => seen.value.get().find(entry => entry.device === id),
    refresh: () => Promise.all([records.refresh(), seen.refresh()]),
    rename: (device: string, name: string) => ctx.wire.call(devicesRename, { device, name }),
    setIcon: (device: string, icon: PcIcon) => ctx.wire.call(devicesIcon, { device, icon }),
    remove: (device: string) => ctx.wire.call(devicesRemove, { device }),
    addAgent: (name: string, access: AgentAccess) => ctx.wire.call(pairAgent, { name, access }),
  }
}

export type DevicesData = ReturnType<typeof devicesData>
