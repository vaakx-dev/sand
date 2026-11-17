import { efforts, type PlanModel } from '../contract'
import type { ApiKey } from '../auth/store'
import { trimSlash } from '@sand/util'
import { z } from 'zod'
import { count, flag, listIn, text } from './fields'
import { getJson } from './http'

const defaultBase = 'https://api.anthropic.com'
const source = 'Anthropic'
const pages = 20

const levelFlags = z.record(z.string(), z.unknown())

const noThinking = z
  .object({ types: z.object({ disabled: flag }) })
  .transform(thinking => thinking.types.disabled)
  .catch(false)

const capabilitiesSchema = z.object({ image_input: flag, thinking: noThinking, effort: levelFlags.catch({}) })

const entrySchema = z.object({
  id: z.string().min(1),
  display_name: text,
  max_input_tokens: count,
  max_tokens: count,
  capabilities: capabilitiesSchema.catch({ image_input: false, thinking: false, effort: {} }),
})

const pageSchema = z.object({ has_more: z.unknown(), last_id: z.string() })

const effortsOf = ({ effort, thinking }: z.infer<typeof capabilitiesSchema>) =>
  efforts.filter(level => (level === 'none' ? thinking : flag.parse(effort) && flag.parse(effort[level])))

const describe = (entry: unknown): PlanModel | undefined => {
  const found = entrySchema.safeParse(entry).data
  if (!found) return undefined
  const { id, display_name, max_input_tokens, max_tokens, capabilities } = found
  return {
    name: id,
    label: display_name ?? id,
    context: max_input_tokens,
    maxOutput: max_tokens,
    efforts: effortsOf(capabilities),
    images: capabilities.image_input,
  }
}

export const discoverAnthropic = async (credential: ApiKey): Promise<PlanModel[]> => {
  const base = trimSlash(credential.base_url || defaultBase)
  const headers = { 'x-api-key': credential.key, 'anthropic-version': '2023-06-01' }
  const found: PlanModel[] = []
  let after: string | undefined
  for (let page = 0; page < pages; page++) {
    const url = `${base}/v1/models?limit=1000${after ? `&after_id=${encodeURIComponent(after)}` : ''}`
    const body = await getJson(source, url, headers)
    found.push(...listIn(source, body).flatMap(entry => describe(entry) ?? []))
    const next = pageSchema.safeParse(body).data
    if (!next?.has_more) break
    after = next.last_id
  }
  return found
}
