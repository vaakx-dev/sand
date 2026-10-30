import { urlFor } from '../routes/hosts'
import type { Found } from './found'
import { probeIdentity } from './probe'

const probeTimeout = 3_000
const forgetAfter = 100_000
const reprobeAfter = 300_000
const maxFound = 64

export const createLanFinds = (changed: () => void) => {
  const found = new Map<string, Found>()
  const probed = new Map<string, number>()
  const probing = new Set<string>()

  const probe = async (url: string, id: string) => {
    probing.add(url)
    const identity = await probeIdentity(url, probeTimeout).finally(() => probing.delete(url))
    if (!identity || identity.id !== id) return
    found.set(id, { identity, url, via: 'lan', seen: Date.now() })
    probed.set(id, Date.now())
    changed()
  }

  const heard = (address: string, port: number, id: string) => {
    const url = urlFor(address, port)
    const known = found.get(id)
    const fresh = known?.url === url && Date.now() - (probed.get(id) ?? 0) < reprobeAfter
    if (known && fresh) known.seen = Date.now()
    if (fresh || probing.has(url) || (!known && found.size >= maxFound)) return
    void probe(url, id)
  }

  const prune = () => {
    const cutoff = Date.now() - forgetAfter
    for (const [id, entry] of found) {
      if (entry.seen >= cutoff) continue
      found.delete(id)
      probed.delete(id)
    }
    changed()
  }

  return { heard, prune, list: () => [...found.values()] }
}
