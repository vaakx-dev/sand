import type { Server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import { modelsAdd, modelsCatalog, modelsNewModels, modelsPref, modelsRefresh, modelsRemove, modelsSeen, type ModelInfo } from '../contract'
import type { Catalog } from '../catalog'
import { qualify, split } from '../catalog/build'
import { added, favourite, hidden, newModels, removed, seen } from '../catalog/prefs'
import type { Prefs } from '../catalog/types'
import type { View } from '../catalog/view'

interface ModelsOptions {
  view: View
  catalog: Catalog
  refreshPeers(): Promise<void>
}

export const serveModels = (server: Server, { view, catalog, refreshPeers }: ModelsOptions) => {
  const source = async (value: string) => {
    await catalog.ready
    if (!view.entry(value)) throw new Error(`Unknown model source "${value}"`)
    return value
  }

  const model = async (value: string) => {
    await catalog.ready
    const id = view.find(value)?.id ?? value
    const parts = split(id)
    if (!parts?.name || !view.entry(parts.source)) throw new Error(`Unknown model "${value}"`)
    return { id, ...parts }
  }

  const update = (edit: (prefs: Prefs) => Prefs) => catalog.setPrefs(edit(catalog.prefs()))

  const add = async (from: string, name: string): Promise<ModelInfo> => {
    const known = view.entry(from)?.models.find(found => found.name === name && !found.added)
    update(prefs => (known ? hidden(prefs, known.id, false) : added(prefs, from, name)))
    const found = view.entry(from)?.models.find(entry => entry.name === name)
    if (!found) throw new Error(`Couldn't add ${qualify(from, name)}`)
    return found
  }

  return joinDisposers(
    server.handle(modelsCatalog, async request => view.list(await source(request.source))),
    server.handle(modelsPref, async ({ model: wanted, hidden: hide, favourite: star }) => {
      const { id } = await model(wanted)
      if (hide !== undefined) update(prefs => hidden(prefs, id, hide))
      if (star !== undefined) update(prefs => favourite(prefs, id, star))
    }),
    server.handle(modelsAdd, async request => {
      const name = request.name.trim()
      if (!name) throw new Error('Enter a model name')
      return add(await source(request.source), name)
    }),
    server.handle(modelsRemove, async request => {
      const { source: from, name } = await model(request.model)
      update(prefs => removed(prefs, from, name))
    }),
    server.handle(modelsNewModels, async request => {
      const from = await source(request.source)
      update(prefs => newModels(prefs, from, request.mode))
    }),
    server.handle(modelsSeen, async request => {
      const from = await source(request.source)
      update(prefs => seen(prefs, from))
    }),
    server.handle(modelsRefresh, async request => {
      const from = request.source === undefined ? undefined : await source(request.source)
      const remote = !from || !!view.entry(from)?.meta.via
      await Promise.all([catalog.refresh(from), ...(remote ? [refreshPeers()] : [])])
    }),
  )
}
