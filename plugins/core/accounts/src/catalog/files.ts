import { isRecord, serial } from '@sand/util'
import { writePrivateJson } from '@sand/util/fs'
import { join } from 'node:path'
import type { NewModels, PlanModel } from '../contract'
import type { Checked, ModelCache, Prefs } from './types'

const record = (value: unknown): Record<string, unknown> => (isRecord(value) ? value : {})

const names = (value: unknown) => (Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.length > 0) : [])

const isNewModels = (mode: unknown): mode is NewModels => mode === 'show' || mode === 'hide'

const isPlanModel = (model: unknown): model is PlanModel => isRecord(model) && typeof model.name === 'string' && !!model.name && typeof model.label === 'string'

const lists = (value: unknown) => Object.fromEntries(Object.entries(record(value)).map(([key, list]) => [key, names(list)]))

export const emptyPrefs = (): Prefs => ({ hide: [], show: [], favourites: [], added: {}, newModels: {}, seen: {}, fresh: {} })

const prefsOf = (value: unknown): Prefs => {
  const raw = record(value)
  return {
    hide: names(raw.hide),
    show: names(raw.show),
    favourites: names(raw.favourites),
    added: lists(raw.added),
    newModels: Object.fromEntries(Object.entries(record(raw.newModels)).filter((entry): entry is [string, NewModels] => isNewModels(entry[1]))),
    seen: lists(raw.seen),
    fresh: lists(raw.fresh),
  }
}

const checkedOf = (value: unknown): Checked | undefined => {
  const raw = record(value)
  if (typeof raw.checked !== 'number') return undefined
  const models = Array.isArray(raw.models) ? raw.models.filter(isPlanModel) : undefined
  return { checked: raw.checked, ...(models && { models }), ...(typeof raw.error === 'string' && { error: raw.error }) }
}

const cacheOf = (value: unknown): ModelCache =>
  Object.fromEntries(Object.entries(record(value)).flatMap(([source, entry]) => {
    const checked = checkedOf(entry)
    return checked ? [[source, checked]] : []
  }))

const jsonFile = <T>(path: string, parse: (value: unknown) => T, failed: (error: unknown) => void) => {
  const queue = serial()
  return {
    async read(): Promise<T> {
      try {
        return parse(await Bun.file(path).json())
      } catch {
        return parse(undefined)
      }
    },
    write(value: T) {
      return queue(() => writePrivateJson(path, value)).catch(failed)
    },
  }
}

export const prefsFile = (home: string, failed: (error: unknown) => void) => jsonFile(join(home, 'model-catalog.json'), prefsOf, failed)

export const cacheFile = (home: string) => jsonFile(join(home, 'model-cache.json'), cacheOf, () => {})
