import { heldKey, type Limits, type SourceInfo } from '@sand/accounts/contract'

interface Checked {
  limits: Limits[]
  sources: SourceInfo[]
  now: number
}

const STALE_MS = 60_000

const unchecked = (limits: Limits[], sources: SourceInfo[]) => {
  const held = new Set(limits.map(found => heldKey(found.source, found.pc)))
  return sources.some(source => source.billing === 'plan' && !held.has(heldKey(source.account ?? source.id, source.pc)))
}

function limitsOutdated({ limits, sources, now }: Checked) {
  return !limits.length || unchecked(limits, sources) || limits.some(found => now - found.updated > STALE_MS)
}

export { limitsOutdated }
