import type { PlanModel } from '../contract'
import { isRecord, trimSlash } from '@sand/util'
import { bearer } from '@sand/util/boot/wire'
import { listIn, nonEmpty } from './fields'
import { getJson } from './http'
import { contexts, isOllama } from './ollama'

const sourceOf = (base: string) => {
  try {
    return `Server ${new URL(base).host}`
  } catch {
    return 'Server'
  }
}

export const modelIds = (source: string, body: unknown) => listIn(source, body, 'data').flatMap(entry => nonEmpty(isRecord(entry) ? entry.id : undefined) ?? [])

export const discoverServer = async (base: string, key?: string): Promise<PlanModel[]> => {
  const url = trimSlash(base)
  const source = sourceOf(url)
  const ids = modelIds(source, await getJson(source, `${url}/models`, key ? bearer(key) : {}))
  const root = url.replace(/\/v1$/, '')
  const context = (await isOllama(root)) ? await contexts(root, ids) : new Map<string, number>()
  return ids.map(id => ({ name: id, label: id, efforts: [], context: context.get(id) }))
}
