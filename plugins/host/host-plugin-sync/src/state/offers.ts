import type { PluginChangeKind, PluginManifest, PluginOffer, PluginTree } from '../contract'

interface CompareInput {
  peer: { id: string; name: string }
  mine: PluginManifest
  theirs: PluginManifest
  bases: Record<string, string>
  skipped: Record<string, string>
  local: Set<string>
}

interface Candidate {
  kind: PluginChangeKind
  both: boolean
}

const byName = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

const own = <T>(map: Record<string, T>, key: string): T | undefined => (Object.hasOwn(map, key) ? map[key] : undefined)

const differing = (a: PluginTree, b: PluginTree) => {
  const paths = new Set([...Object.keys(a.files), ...Object.keys(b.files)])
  return [...paths].filter(path => a.files[path] !== b.files[path]).length
}

const candidate = (m: string | undefined, t: string | undefined, b: string | undefined): Candidate | undefined => {
  if (t === undefined) return b !== undefined && m === b ? { kind: 'removed', both: false } : undefined
  if (m === undefined) {
    if (b === undefined) return { kind: 'new', both: false }
    return b === t ? undefined : { kind: 'new', both: true }
  }
  if (m === b) return { kind: 'changed', both: false }
  if (t === b) return undefined
  return { kind: 'changed', both: true }
}

const fileCount = (kind: PluginChangeKind, mine?: PluginTree, theirs?: PluginTree) => {
  if (kind === 'changed' && mine && theirs) return differing(mine, theirs)
  if (kind === 'new') return Object.keys(theirs?.files ?? {}).length
  return Object.keys(mine?.files ?? {}).length
}

const caseFolded = (mine: PluginManifest, theirs: PluginManifest) => {
  const names = new Map<string, string>()
  if (process.platform !== 'win32') return names
  const theirNames = new Map(Object.keys(theirs.plugins).map(name => [name.toLowerCase(), name]))
  for (const name of Object.keys(mine.plugins)) {
    const match = theirNames.get(name.toLowerCase())
    if (match && match !== name && !Object.hasOwn(theirs.plugins, name)) names.set(match, name)
  }
  return names
}

export const compare = ({ peer, mine, theirs, bases, skipped, local }: CompareInput) => {
  const offers: PluginOffer[] = []
  const nextBases: Record<string, string> = {}
  const nextSkipped: Record<string, string> = {}
  const theirLocal = new Set(theirs.local)
  const folded = caseFolded(mine, theirs)
  const localNames = new Set(folded.values())
  const names = [...new Set([...Object.keys(mine.plugins).filter(name => !localNames.has(name)), ...Object.keys(theirs.plugins)])].sort(byName)
  for (const name of names) {
    const localName = folded.get(name) ?? name
    const m = own(mine.plugins, localName)
    const t = own(theirs.plugins, name)
    const b = own(bases, name) ?? own(bases, localName)
    if (local.has(localName) || theirLocal.has(name)) {
      if (b !== undefined) nextBases[name] = b
      continue
    }
    if (m && t && m.hash === t.hash) {
      nextBases[name] = m.hash
      continue
    }
    if (b !== undefined) nextBases[name] = b
    const found = candidate(m?.hash, t?.hash, b)
    if (!found) continue
    const hash = t?.hash ?? ''
    if (own(skipped, name) === hash) {
      nextSkipped[name] = hash
      continue
    }
    offers.push({
      peer: peer.id,
      peerName: peer.name,
      plugin: name,
      kind: found.kind,
      hash,
      files: fileCount(found.kind, m, t),
      both: found.both,
    })
  }
  return { offers, bases: nextBases, skipped: nextSkipped }
}
