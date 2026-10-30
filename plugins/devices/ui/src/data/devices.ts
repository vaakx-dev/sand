import { type DeviceRecord, type DeviceSeen, devicesChange, devicesList, devicesRemove, devicesRename, devicesSeen } from '@sand/devices-contract'
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
    remove: (device: string) => ctx.wire.call(devicesRemove, { device }),
  }
}

export type DevicesData = ReturnType<typeof devicesData>
