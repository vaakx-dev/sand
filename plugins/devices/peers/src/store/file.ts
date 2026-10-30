import { directRoute } from '@sand/devices-connect'
import type { PcRoutes, PublishedRoute, RoutePrefs, RouteStore } from '@sand/devices-contract'
import { serial } from '@sand/util'
import { writePrivateJson } from '@sand/util/fs'
import { mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import { readRoutes, routesFile } from './read'

export interface PeerRouteStore extends RouteStore {
  publish(pc: string, published: PublishedRoute[]): void
  keep(pcs: string[]): void
}

const noPrefs: RoutePrefs = { order: [], disabled: [] }

const publishedRoutes = (published: PublishedRoute[]) =>
  published.map(route => directRoute(route.url, 'published', route.kind)).filter(route => route !== undefined)

export const fileRouteStore = async (home: string, failed: (error: unknown) => void): Promise<PeerRouteStore> => {
  const file = routesFile(home)
  const saved = await readRoutes(file)
  const queue = serial()

  const write = () =>
    void queue(async () => {
      await mkdir(dirname(file), { recursive: true })
      await writePrivateJson(file, Object.fromEntries(saved))
    }).catch(failed)

  const set = (pc: string, routes: PcRoutes) => {
    saved.set(pc, routes)
    write()
  }

  return {
    load: pc => saved.get(pc),
    save: set,
    publish(pc, published) {
      const known = saved.get(pc)
      const kept = known?.routes.filter(route => route.source !== 'published') ?? []
      set(pc, { routes: [...kept, ...publishedRoutes(published)], prefs: known?.prefs ?? noPrefs })
    },
    keep(pcs) {
      const gone = [...saved.keys()].filter(pc => !pcs.includes(pc))
      for (const pc of gone) saved.delete(pc)
      if (gone.length) write()
    },
  }
}
