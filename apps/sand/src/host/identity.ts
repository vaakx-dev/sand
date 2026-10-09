import type { DeviceInfo } from '@sand/protocol'
import { hostname } from 'node:os'
import { join } from 'node:path'

const savedId = async (file: string) => {
  try {
    const { id } = await Bun.file(file).json()
    if (typeof id === 'string' && id) return id
  } catch {}
  const id = Bun.randomUUIDv7()
  await Bun.write(file, `${JSON.stringify({ id }, null, 2)}\n`)
  return id
}

export const loadIdentity = async (home: string, name?: string): Promise<DeviceInfo> => ({
  id: await savedId(join(home, 'device.json')),
  name: name || hostname(),
  platform: process.platform,
})
