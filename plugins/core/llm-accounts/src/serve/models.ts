import type { Server } from '@sand/server/contract'
import type { ModelInfo, NewModels } from '../contract'
import type { Catalog } from '../catalog'
import { qualify, split } from '../catalog/build'
import { added, favourite, hidden, newModels, removed, seen } from '../catalog/prefs'
import type { Prefs } from '../catalog/types'
import type { View } from '../catalog/view'

export interface ModelsOptions {
  view: View
  catalog: Catalog
  refreshPeers(): Promise<void>
}

export const serveModels = (server: Server, { view, catalog, refreshPeers }: ModelsOptions) => {
  const ready = () => catalog.ready
  const source = async (value: unknown) => {
    await ready()
    if (typeof value !== 'string' || !view.entry(value)) throw new Error(`Unknown model source "${String(value)}"`)
    return value
  }
  const model = async (value: unknown) => {
    await ready()
    const id = typeof value === 'string' ? (view.find(value)?.id ?? value) : ''
    const parts = split(id)
    if (!parts?.name || !view.entry(parts.source)) throw new Error(`Unknown model "${String(value)}"`)
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

  const mode = (value: unknown): NewModels => {
    if (value !== 'show' && value !== 'hide') throw new Error('New models must be "show" or "hide"')
    return value
  }

  const disposers = [
    server.handle('models.catalog', async request => view.list(await source(request.source))),
    server.handle('models.pref', async request => {
      const { id } = await model(request.model)
      if (typeof request.hidden === 'boolean') update(prefs => hidden(prefs, id, request.hidden!))
      if (typeof request.favourite === 'boolean') update(prefs => favourite(prefs, id, request.favourite!))
    }),
    server.handle('models.add', async request => {
      const name = String(request.name ?? '').trim()
      if (!name) throw new Error('Enter a model name')
      return add(await source(request.source), name)
    }),
    server.handle('models.remove', async request => {
      const { source: from, name } = await model(request.model)
      update(prefs => removed(prefs, from, name))
    }),
    server.handle('models.newModels', async request => {
      const from = await source(request.source)
      const chosen = mode(request.mode)
      update(prefs => newModels(prefs, from, chosen))
    }),
    server.handle('models.seen', async request => {
      const from = await source(request.source)
      update(prefs => seen(prefs, from))
    }),
    server.handle('models.refresh', async request => {
      const from = request.source === undefined ? undefined : await source(request.source)
      const remote = !from || !!view.entry(from)?.meta.via
      await Promise.all([catalog.refresh(from), ...(remote ? [refreshPeers()] : [])])
    }),
  ]
  return () => disposers.forEach(dispose => void dispose())
}
