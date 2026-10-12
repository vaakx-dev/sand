import type { ApiKey } from '../auth/store'
import { isRecord, trimSlash } from '@sand/kit'
import { claudeModels, describeClaude } from '../claude/models'
import { listIn, nonEmpty } from './fields'
import { getJson } from './http'
import type { Discovered } from './types'

const defaultBase = 'https://api.anthropic.com'
const source = 'Anthropic'
const pages = 20

const describe = (entry: unknown): Discovered | undefined => {
  if (!isRecord(entry)) return undefined
  const id = nonEmpty(entry.id)
  if (!id) return undefined
  const { label, efforts, defaultEffort, context, fast } = describeClaude(id)
  return {
    name: id,
    label: claudeModels.includes(id) ? label : (nonEmpty(entry.display_name) ?? label),
    efforts,
    defaultEffort,
    context,
    fast,
    images: true,
  }
}

export const discoverAnthropic = async (credential: ApiKey): Promise<Discovered[]> => {
  const base = trimSlash(credential.base_url || defaultBase)
  const headers = { 'x-api-key': credential.key, 'anthropic-version': '2023-06-01' }
  const found: Discovered[] = []
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
