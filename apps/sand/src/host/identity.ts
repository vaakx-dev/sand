import type { DeviceInfo } from '@sand/protocol'
import { errorMessage, isRecord } from '@sand/kit'
import { hostname } from 'node:os'
import { join } from 'node:path'

const readId = async (file: string) => {
  const saved: unknown = await Bun.file(file)
    .json()
    .catch((error: unknown) => {
      throw new Error(`${file} is not valid JSON: ${errorMessage(error)}`)
    })
  if (isRecord(saved) && typeof saved.id === 'string' && saved.id) return saved.id
  throw new Error(`${file} has no device id`)
}

const savedId = async (file: string) => {
  if (await Bun.file(file).exists()) return readId(file)
  const id = Bun.randomUUIDv7()
  await Bun.write(file, `${JSON.stringify({ id }, null, 2)}\n`)
  return id
}

export const loadIdentity = async (home: string, name?: string): Promise<DeviceInfo> => ({
  id: await savedId(join(home, 'device.json')),
  name: name || hostname(),
  platform: process.platform,
})
