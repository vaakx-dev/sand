import type { NewModels } from '../contract'
import { qualify } from './build'
import type { Prefs } from './types'

const without = (list: string[], item: string) => list.filter(found => found !== item)

const withItem = (list: string[], item: string) => (list.includes(item) ? list : [...list, item])

export const noticed = (prefs: Prefs, source: string, names: string[], mode: NewModels): Prefs => {
  const seen = prefs.seen[source]
  if (!seen) return { ...prefs, seen: { ...prefs.seen, [source]: names } }
  const known = new Set(seen)
  const fresh = names.filter(name => !known.has(name))
  if (!fresh.length) return prefs
  const shown = mode === 'show' ? fresh.map(name => qualify(source, name)).filter(id => !prefs.hide.includes(id)) : []
  return {
    ...prefs,
    show: [...prefs.show, ...shown.filter(id => !prefs.show.includes(id))],
    seen: { ...prefs.seen, [source]: [...seen, ...fresh] },
    fresh: { ...prefs.fresh, [source]: [...new Set([...(prefs.fresh[source] ?? []), ...fresh])] },
  }
}

export const hidden = (prefs: Prefs, id: string, value: boolean): Prefs =>
  value
    ? { ...prefs, hide: withItem(prefs.hide, id), show: without(prefs.show, id), favourites: without(prefs.favourites, id) }
    : { ...prefs, hide: without(prefs.hide, id), show: withItem(prefs.show, id) }

export const favourite = (prefs: Prefs, id: string, value: boolean): Prefs =>
  value ? { ...hidden(prefs, id, false), favourites: withItem(prefs.favourites, id) } : { ...prefs, favourites: without(prefs.favourites, id) }

export const added = (prefs: Prefs, source: string, name: string): Prefs => ({
  ...prefs,
  added: { ...prefs.added, [source]: withItem(prefs.added[source] ?? [], name) },
  hide: without(prefs.hide, qualify(source, name)),
})

export const removed = (prefs: Prefs, source: string, name: string): Prefs => {
  const id = qualify(source, name)
  return {
    ...prefs,
    added: { ...prefs.added, [source]: without(prefs.added[source] ?? [], name) },
    show: without(prefs.show, id),
    hide: without(prefs.hide, id),
    favourites: without(prefs.favourites, id),
  }
}

export const newModels = (prefs: Prefs, source: string, mode: NewModels): Prefs => ({ ...prefs, newModels: { ...prefs.newModels, [source]: mode } })

export const seen = (prefs: Prefs, source: string): Prefs => {
  const { [source]: _, ...fresh } = prefs.fresh
  return { ...prefs, fresh }
}
