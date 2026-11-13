import { isRecord } from '@sand/util'
import type { Feature, FeatureDefinition } from '../contract'

const onByDefault = (definition: FeatureDefinition | undefined) => !definition?.addon

const offIn = (definitions: FeatureDefinition[], table: unknown) => {
  const chosen = isRecord(table) ? table : {}
  const on = (definition: FeatureDefinition) => {
    const value = chosen[definition.id]
    return typeof value === 'boolean' ? value : onByDefault(definition)
  }
  return new Set(definitions.filter(definition => !on(definition)).map(definition => definition.id))
}

const requiredBy = (definition: FeatureDefinition) => (definition.parent ? [definition.parent, ...definition.needs] : definition.needs)

const resolve = (definitions: FeatureDefinition[], off: ReadonlySet<string>) => {
  const byId = new Map(definitions.map(definition => [definition.id, definition]))
  const ready = new Map<string, boolean>()
  const isReady = (id: string, path: ReadonlySet<string>): boolean => {
    const known = ready.get(id)
    if (known !== undefined) return known
    const definition = byId.get(id)
    if (!definition) return false
    if (path.has(id)) return false
    const within = new Set([...path, id])
    const value = !off.has(id) && requiredBy(definition).every(need => isReady(need, within))
    ready.set(id, value)
    return value
  }
  const on = new Set(definitions.filter(definition => definition.kind === 'feature' && isReady(definition.id, new Set())).map(definition => definition.id))
  const queue = [...on]
  for (const id of queue)
    for (const wanted of [...byId.get(id)!.needs, ...byId.get(id)!.uses])
      if (byId.get(wanted)?.kind === 'capability' && !on.has(wanted) && isReady(wanted, new Set())) {
        on.add(wanted)
        queue.push(wanted)
      }
  const usedBy = (id: string) => [...on].filter(other => [...byId.get(other)!.needs, ...byId.get(other)!.uses].includes(id))
  return { on: (id: string) => !byId.has(id) || on.has(id), usedBy }
}

export const createCatalog = (definitions: FeatureDefinition[], table: unknown) => {
  const byId = new Map(definitions.map(definition => [definition.id, definition]))
  let off = offIn(definitions, table)
  let state = resolve(definitions, off)

  return {
    on: (id: string | undefined) => id === undefined || state.on(id),
    list: (): Feature[] =>
      definitions.map(definition => ({ ...definition, chosen: !off.has(definition.id), on: state.on(definition.id), usedBy: state.usedBy(definition.id) })),
    onByDefault: (id: string) => onByDefault(byId.get(id)),
    choose(changes: Record<string, boolean>) {
      off = new Set([...off].filter(id => changes[id] !== true))
      for (const [id, on] of Object.entries(changes)) if (!on) off.add(id)
      state = resolve(definitions, off)
    },
  }
}

export type Catalog = ReturnType<typeof createCatalog>
