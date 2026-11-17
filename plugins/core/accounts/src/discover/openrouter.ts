import { bearer } from '@sand/util/host'
import { type Effort, efforts, isEffort, type ModelPrice, type PlanModel } from '../contract'
import { z } from 'zod'
import { count, listIn, text } from './fields'
import { getJson } from './http'

const url = 'https://openrouter.ai/api/v1/models'
const source = 'OpenRouter'
const perMillion = 1_000_000

const priceSchema = z.object({
  prompt: z.unknown().optional(),
  completion: z.unknown().optional(),
  input_cache_write_1h: z.unknown().optional(),
  input_cache_read: z.unknown().optional(),
  input_cache_write: z.unknown().optional(),
})

const reasoningSchema = z.object({ supported_efforts: z.array(z.unknown()), mandatory: z.unknown().optional(), default_effort: z.unknown().optional() })

const entrySchema = z.object({
  id: text,
  name: text,
  context_length: count,
  supported_parameters: z.array(z.unknown()).catch([]),
  architecture: z.object({ input_modalities: z.array(z.unknown()).catch([]) }).catch({ input_modalities: [] }),
  reasoning: z.unknown().optional(),
  pricing: z.unknown().optional(),
})

const perToken = (value: unknown) => {
  const number = typeof value === 'string' || typeof value === 'number' ? Number(value) : NaN
  return Number.isFinite(number) && number >= 0 ? Number((number * perMillion).toPrecision(12)) : undefined
}

const priceOf = (value: unknown): ModelPrice | undefined => {
  const pricing = priceSchema.safeParse(value).data
  if (!pricing) return undefined
  const input = perToken(pricing.prompt)
  const output = perToken(pricing.completion)
  if (input === undefined || output === undefined) return undefined
  const cacheWriteLong = perToken(pricing.input_cache_write_1h)
  return { input, output, cacheRead: perToken(pricing.input_cache_read) ?? 0, cacheWrite: perToken(pricing.input_cache_write) ?? 0, ...(cacheWriteLong !== undefined && { cacheWriteLong }) }
}

const unlisted: Effort[] = ['low', 'medium', 'high']

const reasoningOf = (parameters: unknown[], reasoning: unknown): Pick<PlanModel, 'efforts' | 'defaultEffort'> => {
  if (!parameters.includes('reasoning')) return { efforts: [] }
  const found = reasoningSchema.safeParse(reasoning).data
  if (!found) return { efforts: unlisted }
  const listed = found.supported_efforts
  const offered = efforts.filter(effort => listed.includes(effort) && !(effort === 'none' && found.mandatory === true))
  return { efforts: offered, ...(isEffort(found.default_effort) && { defaultEffort: found.default_effort }) }
}

const describe = (entry: unknown): PlanModel | undefined => {
  const found = entrySchema.safeParse(entry).data
  if (!found) return undefined
  const { id, name, context_length, supported_parameters: parameters, architecture, reasoning, pricing } = found
  if (!id || !parameters.includes('tools')) return undefined
  return {
    name: id,
    label: name?.replace(/^[^:]+:\s+/, '') ?? id,
    context: context_length,
    images: architecture.input_modalities.includes('image'),
    ...reasoningOf(parameters, reasoning),
    price: priceOf(pricing),
  }
}

export const discoverOpenRouter = async (key: string): Promise<PlanModel[]> => {
  const body = await getJson(source, url, bearer(key))
  return listIn(source, body).flatMap(entry => describe(entry) ?? [])
}
