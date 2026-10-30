import { type DeviceRecord, deviceRecordSchema } from '@sand/devices-contract'
import { errorMessage, serial } from '@sand/util'
import { writePrivateJson } from '@sand/util/fs'
import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { z } from 'zod'

const fileSchema = z.array(deviceRecordSchema)

export const devicesFile = (home: string) => join(home, 'devices', 'devices.json')

const read = async (file: string): Promise<DeviceRecord[]> => {
  if (!(await Bun.file(file).exists())) return []
  const saved: unknown = await Bun.file(file)
    .json()
    .catch((error: unknown) => {
      throw new Error(`${file} is not valid JSON: ${errorMessage(error)}`)
    })
  const parsed = fileSchema.safeParse(saved)
  if (!parsed.success) throw new Error(`${file} is not a device list: ${z.prettifyError(parsed.error)}`)
  return parsed.data
}

export const loadDeviceFile = async (home: string) => {
  const file = devicesFile(home)
  const saved = await read(file)
  const queue = serial()
  const save = (records: DeviceRecord[]) =>
    queue(async () => {
      await mkdir(dirname(file), { recursive: true })
      await writePrivateJson(file, records)
    })
  return { saved, save }
}

export type DeviceFile = Awaited<ReturnType<typeof loadDeviceFile>>
