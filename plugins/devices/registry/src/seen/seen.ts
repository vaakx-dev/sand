import { isRecord, serial } from '@sand/util'
import { writePrivateJson } from '@sand/util/fs'
import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'

export const seenFile = (home: string) => join(home, 'devices', 'seen.json')

const read = async (file: string) => {
  const saved: unknown = await Bun.file(file)
    .json()
    .catch(() => undefined)
  if (!isRecord(saved)) return new Map<string, number>()
  return new Map(Object.entries(saved).filter((entry): entry is [string, number] => typeof entry[1] === 'number'))
}

export const loadSeen = async (home: string) => {
  const file = seenFile(home)
  const times = await read(file)
  const queue = serial()
  let dirty = false

  const touch = (devices: string[]) => {
    const now = Date.now()
    for (const device of devices) times.set(device, now)
    if (devices.length) dirty = true
  }

  const flush = () => {
    if (!dirty) return Promise.resolve()
    dirty = false
    const snapshot = Object.fromEntries(times)
    return queue(async () => {
      await mkdir(dirname(file), { recursive: true })
      await writePrivateJson(file, snapshot)
    })
  }

  return { touch, flush, at: (device: string) => times.get(device) }
}

export type Seen = Awaited<ReturnType<typeof loadSeen>>
