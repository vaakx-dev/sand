import type { PcRoutes, RouteStore } from '@sand/devices-contract'
import { savedRoutes } from '../routes/valid'
import { readStored, writeStored } from './integrations/storage'

export const browserRoutesKey = 'sand.routes'

const readAll = (): Record<string, PcRoutes> => savedRoutes(readStored(browserRoutesKey))

export const browserRouteStore = (): RouteStore => ({
  load: pc => readAll()[pc],
  save(pc, routes) {
    writeStored(browserRoutesKey, { ...readAll(), [pc]: routes })
  },
})
