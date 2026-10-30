import { isRecord } from '@sand/util'
import { writePrivateJson } from '@sand/util/fs'
import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'

export const devicesFile = (home: string, name: string) => join(home, 'devices', name)

export const readRecord = async (file: string): Promise<Record<string, unknown>> => {
  const saved: unknown = await Bun.file(file)
    .json()
    .catch(() => undefined)
  return isRecord(saved) ? saved : {}
}

export const writeRecord = async (file: string, value: Record<string, unknown>) => {
  await mkdir(dirname(file), { recursive: true })
  await writePrivateJson(file, value)
}
