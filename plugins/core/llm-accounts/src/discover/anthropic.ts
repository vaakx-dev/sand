import type { Credential } from '../auth/store'
import { claudeModels, describeClaude } from '../claude/models'
import { claudeCodeVersion } from '../claude/system'
import { getJson, trimmed } from './http'
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
        'user-agent': `claude-cli/${claudeCodeVersion} (external, cli)`,
      }
    : { 'x-api-key': credential.key, 'anthropic-version': '2023-06-01' }

const describe = (entry: any): Discovered | undefined => {
  if (typeof entry?.id !== 'string' || !entry.id) return undefined
  const { label, efforts, defaultEffort, context, fast } = describeClaude(entry.id)
  const display = typeof entry.display_name === 'string' && entry.display_name ? entry.display_name : undefined
  return {
    name: entry.id,
    label: claudeModels.includes(entry.id) ? label : (display ?? label),
    efforts,
    defaultEffort,
    context,
    fast,
    images: true,
  }
}

export const discoverAnthropic = async (credential: Credential): Promise<Discovered[]> => {
  const base = trimmed((credential.type === 'api_key' && credential.base_url) || defaultBase)
  const found: Discovered[] = []
  let after: string | undefined
  for (let page = 0; page < pages; page++) {
    const url = `${base}/v1/models?limit=1000${after ? `&after_id=${encodeURIComponent(after)}` : ''}`
    const body = await getJson(source, url, headers(credential))
    if (!Array.isArray(body?.data)) throw new Error(`${source} model list failed: unexpected answer`)
    for (const entry of body.data) {
      const model = describe(entry)
      if (model) found.push(model)
    }
    if (!body.has_more || typeof body.last_id !== 'string') break
    after = body.last_id
  }
  return found
}
