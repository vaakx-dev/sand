import type { OAuth } from '../auth/store'
import { codexTarget } from '../codex/target'
import { describeCodex, takesImages } from '../codex/models'
import type { Effort } from '../contract'
import { getJson } from './http'
import type { Discovered } from './types'

const url = 'https://chatgpt.com/backend-api/codex/models?client_version=0.99.0'
const source = 'Codex'
const allEfforts: Effort[] = ['low', 'medium', 'high', 'xhigh', 'max']

const effortOf = (value: unknown) => {
  const name = typeof value === 'string' ? value : (value as { effort?: unknown } | null)?.effort
  return allEfforts.find(effort => effort === name)
}

const effortsOf = (levels: unknown) => (Array.isArray(levels) ? levels.map(effortOf).filter((effort): effort is Effort => !!effort) : [])

const describe = (entry: any): Discovered | undefined => {
  const name = entry?.slug ?? entry?.id
  if (typeof name !== 'string' || !name || entry.visibility === 'hide') return undefined
  const known = describeCodex(name)
  const efforts = effortsOf(entry.supported_reasoning_levels)
  const defaultEffort = effortOf(entry.default_reasoning_level ?? entry.default_reasoning_effort)
  return {
    name,
    label: typeof entry.display_name === 'string' && entry.display_name ? entry.display_name : known.label,
    context: typeof entry.context_window === 'number' && entry.context_window > 0 ? entry.context_window : known.context,
    efforts: efforts.length ? efforts : known.efforts,
    defaultEffort: defaultEffort ?? (efforts.length ? (efforts.includes('medium') ? 'medium' : efforts[0]) : known.defaultEffort),
    images: takesImages(name),
  }
}

export const discoverCodex = async (credential: OAuth): Promise<Discovered[]> => {
  const { headers } = codexTarget(credential, crypto.randomUUID())
  const { 'content-type': _type, ...rest } = headers
  const body = await getJson(source, url, { ...rest, accept: 'application/json' })
  if (!Array.isArray(body?.models)) throw new Error(`${source} model list failed: unexpected answer`)
  const found = body.models.map(describe).filter((model: Discovered | undefined): model is Discovered => !!model)
  if (!found.length) throw new Error(`${source} model list failed: no models in the answer`)
  return found
}
