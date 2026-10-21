import type { ModelInfo, PlanModel } from '../contract'
import { newModelsOf } from '../auth/kinds'
import type { Prefs, SourceMeta } from './types'

export const qualify = (source: string, name: string) => `${source}/${name}`

export const split = (id: string) => {
  const at = id.indexOf('/')
  return at < 0 ? undefined : { source: id.slice(0, at), name: id.slice(at + 1) }
}

export const modelOf = (meta: SourceMeta, { name, efforts = [], price: _, ...rest }: PlanModel): ModelInfo => ({
  ...rest,
  efforts,
  id: qualify(meta.id, name),
  source: meta.id,
  name,
  provider: meta.provider,
  ...(meta.via && { via: meta.via }),
})

export const unknownModel = (meta: SourceMeta, name: string) => modelOf(meta, { name, label: name })

export const shownByDefault = (meta: SourceMeta) => !!meta.via || newModelsOf(meta.kind) === 'show'

const strip = ({ hidden: _, favourite: __, fresh: ___, added: ____, ...model }: ModelInfo): ModelInfo => model

export const decorate = (meta: SourceMeta, bases: ModelInfo[], prefs: Prefs): ModelInfo[] => {
  const added = prefs.added[meta.id] ?? []
  const fresh = new Set(prefs.fresh[meta.id] ?? [])
  const names = new Set(bases.map(model => model.name))
  const extra = added.filter(name => !names.has(name)).map(name => ({ ...unknownModel(meta, name), added: true }))
  const hide = new Set(prefs.hide)
  const show = new Set(prefs.show)
  const byDefault = shownByDefault(meta)
  return [...bases.map(strip), ...extra].map(model => {
    const name = model.name ?? model.id
    const visible = !hide.has(model.id) && (show.has(model.id) || added.includes(name) || byDefault)
    const favourite = prefs.favourites.indexOf(model.id)
    return {
      ...model,
      ...(!visible && { hidden: true }),
      ...(favourite >= 0 && { favourite }),
      ...(fresh.has(name) && { fresh: true }),
    }
  })
}
