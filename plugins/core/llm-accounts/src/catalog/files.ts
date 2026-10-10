import { join } from 'node:path'
import { writePrivateJson } from '../auth/store'
import type { Checked, ModelCache, Prefs } from './types'

const record = (value: unknown): Record<string, unknown> => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {})

const names = (value: unknown) => (Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.length > 0) : [])

const lists = (value: unknown) => Object.fromEntries(Object.entries(record(value)).map(([key, list]) => [key, names(list)]))

export const emptyPrefs = (): Prefs => ({ hide: [], show: [], favourites: [], added: {}, newModels: {}, seen: {}, fresh: {} })

const prefsOf = (value: unknown): Prefs => {
  const raw = record(value)
  return {
    hide: names(raw.hide),
    show: names(raw.show),
    favourites: names(raw.favourites),
    added: lists(raw.added),
    newModels: Object.fromEntries(Object.entries(record(raw.newModels)).filter(([, mode]) => mode === 'show' || mode === 'hide')) as Prefs['newModels'],
    seen: lists(raw.seen),
    fresh: lists(raw.fresh),
  }
}

const checkedOf = (value: unknown): Checked | undefined => {
  const raw = record(value)
  if (typeof raw.checked !== 'number') return undefined
  const models = Array.isArray(raw.models) ? raw.models.filter(model => typeof model?.name === 'string' && model.name) : undefined
  return { checked: raw.checked, ...(models && { models }), ...(typeof raw.error === 'string' && { error: raw.error }) }
}

const cacheOf = (value: unknown): ModelCache =>
  Object.fromEntries(Object.entries(record(value)).flatMap(([source, entry]) => {
    const checked = checkedOf(entry)
    return checked ? [[source, checked]] : []
  }))

const jsonFile = <T>(path: string, parse: (value: unknown) => T) => {
  let writing = Promise.resolve()
  return {
    async read(): Promise<T> {
      try {
        return parse(await Bun.file(path).json())
      } catch {
        return parse(undefined)
      }
    },
    write(value: T) {
      writing = writing.catch(() => {}).then(() => writePrivateJson(path, value))
      return writing.catch(() => {})
    },
  }
}

export const prefsFile = (home: string) => jsonFile(join(home, 'model-catalog.json'), prefsOf)

export const cacheFile = (home: string) => jsonFile(join(home, 'model-cache.json'), cacheOf)
