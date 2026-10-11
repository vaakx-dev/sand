import type { ModelPrice } from '../contract'
import { bearer, isRecord } from '@sand/kit'
import { listIn, nonEmpty, positive } from './fields'
import { getJson } from './http'
import type { Discovered } from './types'

const url = 'https://openrouter.ai/api/v1/models'
const source = 'OpenRouter'
const perMillion = 1_000_000

const perToken = (value: unknown) => {
  const number = typeof value === 'string' || typeof value === 'number' ? Number(value) : NaN
  return Number.isFinite(number) && number >= 0 ? Number((number * perMillion).toPrecision(12)) : undefined
}

const priceOf = (pricing: unknown): ModelPrice | undefined => {
  if (!isRecord(pricing)) return undefined
  const input = perToken(pricing.prompt)
  const output = perToken(pricing.completion)
  if (input === undefined || output === undefined) return undefined
  return { input, output, cacheRead: perToken(pricing.input_cache_read) ?? 0, cacheWrite: perToken(pricing.input_cache_write) ?? 0 }
}

const listOf = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])

const describe = (entry: unknown): Discovered | undefined => {
  if (!isRecord(entry)) return undefined
  const id = nonEmpty(entry.id)
  const parameters = listOf(entry.supported_parameters)
  if (!id || !parameters.includes('tools')) return undefined
  const reasoning = parameters.includes('reasoning')
  const modalities = listOf(isRecord(entry.architecture) ? entry.architecture.input_modalities : undefined)
  return {
    name: id,
    label: nonEmpty(entry.name)?.replace(/^[^:]+:\s+/, '') ?? id,
    context: positive(entry.context_length),
    images: modalities.includes('image'),
    efforts: reasoning ? ['low', 'medium', 'high'] : [],
    defaultEffort: reasoning ? 'medium' : undefined,
    price: priceOf(entry.pricing),
  }
}

export const discoverOpenRouter = async (key: string): Promise<Discovered[]> => {
  const body = await getJson(source, url, bearer(key))
  return listIn(source, body, 'data').flatMap(entry => describe(entry) ?? [])
}
