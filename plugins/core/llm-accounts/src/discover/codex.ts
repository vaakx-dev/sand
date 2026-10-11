import type { OAuth } from '../auth/store'
import { isRecord } from '@sand/kit'
import { describeCodex, takesImages } from '../codex/models'
import { codexTarget } from '../codex/target'
import type { Effort } from '../contract'
import { listIn, nonEmpty, positive } from './fields'
import { getJson } from './http'
import type { Discovered } from './types'

const url = 'https://chatgpt.com/backend-api/codex/models?client_version=0.99.0'
const source = 'Codex'
const allEfforts: Effort[] = ['low', 'medium', 'high', 'xhigh', 'max']

const effortOf = (value: unknown) => {
  const name = isRecord(value) ? value.effort : value
  return allEfforts.find(effort => effort === name)
}

const effortsOf = (levels: unknown) => (Array.isArray(levels) ? levels.flatMap(level => effortOf(level) ?? []) : [])

const defaultOf = (efforts: Effort[], fallback: Effort | undefined) => {
  if (!efforts.length) return fallback
  return efforts.includes('medium') ? 'medium' : efforts[0]
}

const describe = (entry: unknown): Discovered | undefined => {
  if (!isRecord(entry)) return undefined
  const name = entry.slug ?? entry.id
  if (typeof name !== 'string' || !name || entry.visibility === 'hide') return undefined
  const known = describeCodex(name)
  const efforts = effortsOf(entry.supported_reasoning_levels)
  return {
    name,
    label: nonEmpty(entry.display_name) ?? known.label,
    context: positive(entry.context_window) ?? known.context,
    efforts: efforts.length ? efforts : known.efforts,
    defaultEffort: effortOf(entry.default_reasoning_level ?? entry.default_reasoning_effort) ?? defaultOf(efforts, known.defaultEffort),
    images: takesImages(name),
  }
}

export const discoverCodex = async (credential: OAuth): Promise<Discovered[]> => {
  const { headers } = codexTarget(credential, crypto.randomUUID())
  const { 'content-type': _type, ...rest } = headers
  const body = await getJson(source, url, { ...rest, accept: 'application/json' })
  const found = listIn(source, body, 'models').flatMap(entry => describe(entry) ?? [])
  if (!found.length) throw new Error(`${source} model list failed: no models in the answer`)
  return found
}
