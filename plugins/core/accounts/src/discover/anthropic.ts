import type { Effort, PlanModel } from '../contract'
import type { ApiKey } from '../auth/store'
import { isRecord, trimSlash } from '@sand/util'
import { listIn, nonEmpty, positive } from './fields'
import { getJson } from './http'

const defaultBase = 'https://api.anthropic.com'
const source = 'Anthropic'
const pages = 20
const levels: Effort[] = ['low', 'medium', 'high', 'xhigh', 'max']

const supported = (value: unknown) => isRecord(value) && value.supported === true

const effortsOf = (effort: unknown) => (isRecord(effort) && supported(effort) ? levels.filter(level => supported(effort[level])) : [])

const describe = (entry: unknown): PlanModel | undefined => {
  if (!isRecord(entry)) return undefined
  const id = nonEmpty(entry.id)
  if (!id) return undefined
  const capabilities = isRecord(entry.capabilities) ? entry.capabilities : {}
  return {
    name: id,
    label: nonEmpty(entry.display_name) ?? id,
    context: positive(entry.max_input_tokens),
    maxOutput: positive(entry.max_tokens),
    efforts: effortsOf(capabilities.effort),
    images: supported(capabilities.image_input),
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
    found.push(...listIn(source, body, 'data').flatMap(entry => describe(entry) ?? []))
    if (!isRecord(body) || !body.has_more || typeof body.last_id !== 'string') break
    after = body.last_id
  }
  return found
}
