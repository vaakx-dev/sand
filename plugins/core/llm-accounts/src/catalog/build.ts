import type { ModelInfo } from '../contract'
import type { Discovered } from '../discover'
import { builtinNames, builtinRank, describe, hasBuiltin } from './builtin'
import type { Prefs, SourceMeta } from './types'

export const qualify = (source: string, name: string) => `${source}/${name}`

export const split = (id: string) => {
  const at = id.indexOf('/')
  return at < 0 ? undefined : { source: id.slice(0, at), name: id.slice(at + 1) }
}

export const modelOf = (meta: SourceMeta, found: Discovered): ModelInfo => ({
  ...describe(meta.kind, found),
  id: qualify(meta.id, found.name),
  source: meta.id,
  name: found.name,
  provider: meta.provider,
  ...(meta.via && { via: meta.via }),
})

export const shownByDefault = (meta: SourceMeta, name: string) => {
  if (meta.via) return true
  if (meta.kind === 'server') return true
  if (meta.kind === 'openrouter') return false
  return hasBuiltin(meta.kind) && builtinNames(meta.kind).includes(name)
}

const order = (meta: SourceMeta) => (a: ModelInfo, b: ModelInfo) =>
  builtinRank(meta.kind, a.name ?? a.id) - builtinRank(meta.kind, b.name ?? b.id) || a.label.localeCompare(b.label)

const strip = ({ hidden: _, favourite: __, fresh: ___, added: ____, ...model }: ModelInfo): ModelInfo => model

export const decorate = (meta: SourceMeta, bases: ModelInfo[], prefs: Prefs): ModelInfo[] => {
  const added = prefs.added[meta.id] ?? []
  const fresh = new Set(prefs.fresh[meta.id] ?? [])
  const names = new Set(bases.map(model => model.name))
  const extra = added.filter(name => !names.has(name)).map(name => ({ ...modelOf(meta, { name }), added: true }))
  const hide = new Set(prefs.hide)
  const show = new Set(prefs.show)
  return [...bases.map(strip), ...extra]
    .map(model => {
      const name = model.name ?? model.id
      const visible = hide.has(model.id) ? false : show.has(model.id) || added.includes(name) || shownByDefault(meta, name)
      const favourite = prefs.favourites.indexOf(model.id)
      return {
        ...model,
        ...(!visible && { hidden: true }),
        ...(favourite >= 0 && { favourite }),
        ...(fresh.has(name) && { fresh: true }),
      }
    })
    .sort(order(meta))
}
