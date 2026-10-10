import type { FixedId } from './kinds'
import { credentialOf, type Credential, type Saved } from './store'

export interface Located {
  key: string
  credential: Credential
}

const legacy: Partial<Record<FixedId, string>> = { claude: 'anthropic', codex: 'openai' }

const wanted: Record<FixedId, Credential['type']> = {
  claude: 'oauth',
  codex: 'oauth',
  anthropic: 'api_key',
  openai: 'api_key',
  openrouter: 'api_key',
}

const at = (saved: Saved, key: string, type: Credential['type']): Located | undefined => {
  const credential = credentialOf(saved, key)
  return credential?.type === type ? { key, credential } : undefined
}

export const locate = (saved: Saved, id: FixedId): Located | undefined => {
  const own = at(saved, id, wanted[id])
  if (own) return own
  const old = legacy[id]
  return old ? at(saved, old, 'oauth') : undefined
}

export const holders = (saved: Saved, id: FixedId) => {
  const old = legacy[id]
  const keys = [id, ...(old ? [old] : [])]
  return keys.filter(key => at(saved, key, key === id ? wanted[id] : 'oauth'))
}

export const displaced = (saved: Saved, id: FixedId): Saved => {
  const owner = Object.entries(legacy).find(([, key]) => key === id)?.[0] as FixedId | undefined
  const old = owner && at(saved, id, 'oauth')
  return owner && old && !at(saved, owner, 'oauth') ? { [owner]: old.credential } : {}
}
