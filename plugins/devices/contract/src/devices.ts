import { helloField, request, type, wireEvent } from '@sand/host-hub/contract'
import { z } from 'zod'
import type { DeviceRecord, PcIdentity } from './records'
import { deviceRecordSchema } from './schemas'

export const devicesList = request('devices.list', { input: z.object({}), output: type<DeviceRecord[]>() })
export const devicesRename = request('devices.rename', {
  input: z.object({ device: z.string().min(1), name: z.string().trim().min(1) }),
  output: type<DeviceRecord>(),
})
export const devicesRemove = request('devices.remove', { input: z.object({ device: z.string().min(1) }), output: type<void>() })
export const devicesSync = request('devices.sync', {
  input: z.object({ records: z.array(deviceRecordSchema) }),
  output: type<DeviceRecord[]>(),
  callers: 'pc',
})
export const devicesChange = wireEvent<DeviceRecord[]>('devices.change')

export interface DeviceSeen {
  device: string
  online: boolean
  at: number
}

export const devicesSeen = request('devices.seen', { input: z.object({}), output: type<DeviceSeen[]>() })

export const pcRename = request('pc.rename', { input: z.object({ name: z.string().trim().min(1) }), output: type<PcIdentity>() })

export const helloPc = helloField<PcIdentity>('pc')
export const helloDevice = helloField<DeviceRecord>('device')
export const helloSession = helloField<string>('session')
