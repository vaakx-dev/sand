import { savedRoutes } from '@sand/devices-connect'
import type { PcRoutes } from '@sand/devices-contract'
import { readState } from '@sand/util/fs'
import { join } from 'node:path'

export const devicesFolder = (home: string) => join(home, 'devices')

export const routesFileName = 'routes.json'

export const routesFile = (home: string) => join(devicesFolder(home), routesFileName)

const routesOf = (saved: unknown) => new Map(Object.entries(savedRoutes(saved)))

export const readRoutes = async (file: string): Promise<Map<string, PcRoutes>> => (await readState(file, routesOf)) ?? new Map()
