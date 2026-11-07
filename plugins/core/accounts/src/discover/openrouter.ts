import { bearer } from '@sand/util/host'
import { type Effort, efforts, isEffort, type ModelPrice, type PlanModel } from '../contract'
import { isRecord } from '@sand/util'
import { listIn, nonEmpty, positive } from './fields'
import { getJson } from './http'

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
  const cacheWriteLong = perToken(pricing.input_cache_write_1h)
  return { input, output, cacheRead: perToken(pricing.input_cache_read) ?? 0, cacheWrite: perToken(pricing.input_cache_write) ?? 0, ...(cacheWriteLong !== undefined && { cacheWriteLong }) }
}

const listOf = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])

const unlisted: Effort[] = ['low', 'medium', 'high']

const reasoningOf = (parameters: unknown[], reasoning: unknown): Pick<PlanModel, 'efforts' | 'defaultEffort'> => {
  if (!parameters.includes('reasoning')) return { efforts: [] }
  if (!isRecord(reasoning) || !Array.isArray(reasoning.supported_efforts)) return { efforts: unlisted }
  const listed: unknown[] = reasoning.supported_efforts
  const offered = efforts.filter(effort => listed.includes(effort) && !(effort === 'none' && reasoning.mandatory === true))
  return { efforts: offered, ...(isEffort(reasoning.default_effort) && { defaultEffort: reasoning.default_effort }) }
}

const describe = (entry: unknown): PlanModel | undefined => {
  if (!isRecord(entry)) return undefined
  const id = nonEmpty(entry.id)
  const parameters = listOf(entry.supported_parameters)
  if (!id || !parameters.includes('tools')) return undefined
  const modalities = listOf(isRecord(entry.architecture) ? entry.architecture.input_modalities : undefined)
  return {
    name: id,
    label: nonEmpty(entry.name)?.replace(/^[^:]+:\s+/, '') ?? id,
    context: positive(entry.context_length),
    images: modalities.includes('image'),
    ...reasoningOf(parameters, entry.reasoning),
    price: priceOf(entry.pricing),
  }
}

export const discoverOpenRouter = async (key: string): Promise<PlanModel[]> => {
  const body = await getJson(source, url, bearer(key))
  return listIn(source, body, 'data').flatMap(entry => describe(entry) ?? [])
}
