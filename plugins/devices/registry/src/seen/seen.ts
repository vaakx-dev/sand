import { isRecord, serial } from '@sand/util'
import { readState, writePrivateJson } from '@sand/util/fs'
import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'

export const seenFile = (home: string) => join(home, 'devices', 'seen.json')

const timesOf = (saved: unknown) =>
  new Map(isRecord(saved) ? Object.entries(saved).filter((entry): entry is [string, number] => typeof entry[1] === 'number') : [])

const read = async (file: string) => (await readState(file, timesOf)) ?? new Map<string, number>()

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
