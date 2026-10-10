import type { ModelPrice } from '../contract'
import { bearer, getJson } from './http'
import type { Discovered } from './types'

const url = 'https://openrouter.ai/api/v1/models'
const source = 'OpenRouter'
const perMillion = 1_000_000

const perToken = (value: unknown) => {
  const number = typeof value === 'string' || typeof value === 'number' ? Number(value) : NaN
  return Number.isFinite(number) && number >= 0 ? Number((number * perMillion).toPrecision(12)) : undefined
}

const priceOf = (pricing: any): ModelPrice | undefined => {
  const input = perToken(pricing?.prompt)
  const output = perToken(pricing?.completion)
  if (input === undefined || output === undefined) return undefined
  return { input, output, cacheRead: perToken(pricing.input_cache_read) ?? 0, cacheWrite: perToken(pricing.input_cache_write) ?? 0 }
}

const describe = (entry: any): Discovered | undefined => {
  const parameters: unknown[] = Array.isArray(entry?.supported_parameters) ? entry.supported_parameters : []
  if (typeof entry?.id !== 'string' || !entry.id || !parameters.includes('tools')) return undefined
  const reasoning = parameters.includes('reasoning')
  const modalities: unknown[] = Array.isArray(entry.architecture?.input_modalities) ? entry.architecture.input_modalities : []
  const label = typeof entry.name === 'string' && entry.name ? entry.name.replace(/^[^:]+:\s+/, '') : entry.id
  return {
    name: entry.id,
    label,
    context: typeof entry.context_length === 'number' && entry.context_length > 0 ? entry.context_length : undefined,
    images: modalities.includes('image'),
    efforts: reasoning ? ['low', 'medium', 'high'] : [],
    defaultEffort: reasoning ? 'medium' : undefined,
    price: priceOf(entry.pricing),
  }
}

export const discoverOpenRouter = async (key: string): Promise<Discovered[]> => {
  const body = await getJson(source, url, bearer(key))
  if (!Array.isArray(body?.data)) throw new Error(`${source} model list failed: unexpected answer`)
  return body.data.map(describe).filter((model: Discovered | undefined): model is Discovered => !!model)
}
