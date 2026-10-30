import type { PcRoutes, RouteStore } from '@sand/devices-contract'
import { isRecord } from '@sand/util'
import { isPcRoutes } from '../routes/valid'
import { readStored, writeStored } from './integrations/storage'

export const browserRoutesKey = 'sand.routes'

const readAll = (): Record<string, PcRoutes> => {
  const saved = readStored(browserRoutesKey)
  if (!isRecord(saved)) return {}
  return Object.fromEntries(Object.entries(saved).filter((entry): entry is [string, PcRoutes] => isPcRoutes(entry[1])))
}

export const browserRouteStore = (): RouteStore => ({
  load: pc => readAll()[pc],
  save(pc, routes) {
    writeStored(browserRoutesKey, { ...readAll(), [pc]: routes })
  },
})
