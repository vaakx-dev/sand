import { isPcRoutes } from '@sand/devices-connect'
import type { PcRoutes } from '@sand/devices-contract'
import { isRecord } from '@sand/util'
import { readState } from '@sand/util/fs'
import { join } from 'node:path'

export const devicesFolder = (home: string) => join(home, 'devices')

export const routesFileName = 'routes.json'

export const routesFile = (home: string) => join(devicesFolder(home), routesFileName)

const routesOf = (saved: unknown) =>
  new Map(isRecord(saved) ? Object.entries(saved).filter((entry): entry is [string, PcRoutes] => isPcRoutes(entry[1])) : [])

export const readRoutes = async (file: string): Promise<Map<string, PcRoutes>> => (await readState(file, routesOf)) ?? new Map()
