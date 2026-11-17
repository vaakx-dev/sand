import { lazy } from '@sand/util'
import { readState, writePrivateJson } from '@sand/util/fs'
import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { z } from 'zod'

const recordSchema = lazy(() => z.record(z.string(), z.unknown()))

export const devicesFile = (home: string, name: string) => join(home, 'devices', name)

export const readRecord = async (file: string): Promise<Record<string, unknown>> =>
  (await readState(file, saved => recordSchema().safeParse(saved).data ?? {})) ?? {}

export const writeRecord = async (file: string, value: Record<string, unknown>) => {
  await mkdir(dirname(file), { recursive: true })
  await writePrivateJson(file, value)
}
