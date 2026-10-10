import type { ModelInfo, ModelPrice } from '../contract'
import type { Accounts } from '../auth/accounts'
import { isFixed, newModelsDefaults } from '../auth/kinds'
import { rawMessage } from '../errors'
import { builtinNames } from './builtin'
import { decorate, modelOf, split } from './build'
import { discover } from './discovery'
import { cacheFile, emptyPrefs, prefsFile } from './files'
import { forgotten, noticed } from './prefs'
import type { PriceList } from './prices'
import { localMetas } from './sources'
import type { Entry, ModelCache, Prefs, SourceMeta } from './types'

export interface CatalogOptions {
  home: string
  accounts: Accounts
  prices: PriceList
  changed(): void
}

export type Catalog = ReturnType<typeof createCatalog>

export const createCatalog = ({ home, accounts, prices, changed }: CatalogOptions) => {
  const prefsStore = prefsFile(home)
  const cacheStore = cacheFile(home)
  let prefs = emptyPrefs()
  let cache: ModelCache = {}
  const running = new Map<string, Promise<void>>()
  const prints = new Map<string, string>()

  const ready = Promise.all([prefsStore.read(), cacheStore.read()]).then(([readPrefs, readCache]) => {
    prefs = readPrefs
    cache = readCache
  })

  const mode = (meta: SourceMeta) => prefs.newModels[meta.id] ?? newModelsDefaults[meta.kind]

  const bases = (meta: SourceMeta) => (cache[meta.id]?.models ?? builtinNames(meta.kind).map(name => ({ name }))).map(found => modelOf(meta, found))

  const entry = (meta: SourceMeta, models: ModelInfo[]): Entry => {
    const checked = meta.via ? undefined : cache[meta.id]
    return {
      meta,
      models: decorate(meta, models, prefs),
      newModels: mode(meta),
      ...(checked && { checked: checked.checked }),
      ...(checked?.error && { error: checked.error }),
    }
  }

  const setPrefs = (next: Prefs) => {
    if (next === prefs) return
    prefs = next
    void prefsStore.write(prefs)
    changed()
  }

  const store = (source: string, value: ModelCache[string]) => {
    cache = { ...cache, [source]: value }
    void cacheStore.write(cache)
  }

  const run = async (meta: SourceMeta) => {
    try {
      const models = await discover(accounts, meta)
      if (!accounts.ids().includes(meta.id)) return
      store(meta.id, { checked: Date.now(), models })
      prefs = noticed(prefs, meta.id, models.map(model => model.name), mode(meta))
      void prefsStore.write(prefs)
    } catch (error) {
      if (!accounts.ids().includes(meta.id)) return
      const before = cache[meta.id]?.models
      store(meta.id, { checked: Date.now(), ...(before && { models: before }), error: rawMessage(error) })
    }
    changed()
  }

  const refreshOne = (meta: SourceMeta) => {
    const busy = running.get(meta.id)
    if (busy) return busy
    const started = run(meta).finally(() => running.delete(meta.id))
    running.set(meta.id, started)
    return started
  }

  const refresh = async (source?: string) => {
    await Promise.all([ready, accounts.ready])
    await Promise.all(localMetas(accounts).filter(meta => !source || meta.id === source).map(refreshOne))
  }

  const forget = (id: string) => {
    prints.delete(id)
    if (isFixed(id)) return
    prefs = forgotten(prefs, id)
    void prefsStore.write(prefs)
  }

  const prune = (ids: Set<string>) => {
    const stale = Object.keys(cache).filter(id => !ids.has(id))
    if (!stale.length) return
    cache = Object.fromEntries(Object.entries(cache).filter(([id]) => ids.has(id)))
    void cacheStore.write(cache)
  }

  const sync = () => {
    const metas = localMetas(accounts)
    const ids = new Set(metas.map(meta => meta.id))
    for (const id of [...prints.keys()]) if (!ids.has(id)) forget(id)
    prune(ids)
    for (const meta of metas) {
      const print = accounts.fingerprint(meta.id)
      if (prints.get(meta.id) === print) continue
      prints.set(meta.id, print)
      void refreshOne(meta)
    }
  }

  return {
    ready,
    entries: () => localMetas(accounts).map(meta => entry(meta, bases(meta))),
    entry,
    prefs: () => prefs,
    setPrefs,
    refresh,
    sync,
    price(id: string): ModelPrice | undefined {
      const parts = split(id)
      const name = parts?.name ?? id
      const kind = parts && accounts.kind(parts.source)
      const found = parts && kind === 'openrouter' ? cache[parts.source]?.models?.find(model => model.name === name)?.price : undefined
      const listed = !parts || (!!kind && kind !== 'server')
      return prices.custom(id, name) ?? found ?? (listed ? prices.known(name) : undefined)
    },
  }
}
