import { bearer, getJson, trimmed } from './http'
import { contexts, isOllama } from './ollama'
import type { Discovered } from './types'

const sourceOf = (base: string) => {
  try {
    return `Server ${new URL(base).host}`
  } catch {
    return 'Server'
  }
}

export const modelIds = (body: any) =>
  Array.isArray(body?.data) ? body.data.map((entry: any) => entry?.id).filter((id: unknown): id is string => typeof id === 'string' && !!id) : undefined

export const discoverServer = async (base: string, key?: string): Promise<Discovered[]> => {
  const url = trimmed(base)
  const source = sourceOf(url)
  const ids = modelIds(await getJson(source, `${url}/models`, bearer(key)))
  if (!ids) throw new Error(`${source} model list failed: unexpected answer`)
  const root = url.replace(/\/v1$/, '')
  const context = (await isOllama(root)) ? await contexts(root, ids) : new Map<string, number>()
  return ids.map((id: string) => ({ name: id, label: id, efforts: [], context: context.get(id) }))
}
