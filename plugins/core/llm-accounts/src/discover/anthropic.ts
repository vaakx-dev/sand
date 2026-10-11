import type { Credential } from '../auth/store'
import { isRecord, trimSlash } from '@sand/kit'
import { claudeModels, describeClaude } from '../claude/models'
import { claudeUserAgent } from '../claude/system'
import { listIn, nonEmpty } from './fields'
import { getJson } from './http'
import type { Discovered } from './types'

const defaultBase = 'https://api.anthropic.com'
const source = 'Anthropic'
const pages = 20

const headers = (credential: Credential): Record<string, string> =>
  credential.type === 'oauth'
    ? {
        authorization: `Bearer ${credential.access}`,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'oauth-2025-04-20',
        'user-agent': claudeUserAgent,
      }
    : { 'x-api-key': credential.key, 'anthropic-version': '2023-06-01' }

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

export const discoverAnthropic = async (credential: Credential): Promise<Discovered[]> => {
  const base = trimSlash((credential.type === 'api_key' && credential.base_url) || defaultBase)
  const found: Discovered[] = []
  let after: string | undefined
  for (let page = 0; page < pages; page++) {
    const url = `${base}/v1/models?limit=1000${after ? `&after_id=${encodeURIComponent(after)}` : ''}`
    const body = await getJson(source, url, headers(credential))
    found.push(...listIn(source, body, 'data').flatMap(entry => describe(entry) ?? []))
    if (!isRecord(body) || !body.has_more || typeof body.last_id !== 'string') break
    after = body.last_id
  }
  return found
}
