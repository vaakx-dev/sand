import { isPcRoutes } from '@sand/devices-connect'
import type { PcRoutes } from '@sand/devices-contract'
import { isRecord } from '@sand/util'
import { join } from 'node:path'

export const devicesFolder = (home: string) => join(home, 'devices')

export const routesFileName = 'routes.json'

export const routesFile = (home: string) => join(devicesFolder(home), routesFileName)

export const readRoutes = async (file: string): Promise<Map<string, PcRoutes>> => {
  const saved: unknown = await Bun.file(file)
    .json()
    .catch(() => undefined)
  if (!isRecord(saved)) return new Map()
  return new Map(Object.entries(saved).filter((entry): entry is [string, PcRoutes] => isPcRoutes(entry[1])))
}
