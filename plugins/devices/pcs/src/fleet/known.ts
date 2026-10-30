import { isRecord } from '@sand/util'
import { readStored, writeStored } from '../integrations/storage'

export interface KnownPc {
  id: string
  name: string
  platform?: string
  seen?: number
}

const knownKey = 'sand.pcs'
const seenPrecision = 30_000

const isKnown = (value: unknown): value is KnownPc =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  typeof value.name === 'string' &&
  (value.platform === undefined || typeof value.platform === 'string') &&
  (value.seen === undefined || typeof value.seen === 'number')

const same = (a: KnownPc | undefined, b: KnownPc) => a?.name === b.name && a.platform === b.platform

export const knownPcs = () => {
  const saved = readStored(knownKey)
  const pcs = new Map((Array.isArray(saved) ? saved.filter(isKnown) : []).map(pc => [pc.id, pc]))

  const save = () => writeStored(knownKey, [...pcs.values()])

  return {
    get: (id: string) => pcs.get(id),
    ids: () => [...pcs.keys()],
    learn(pc: KnownPc) {
      const known = pcs.get(pc.id)
      if (same(known, pc)) return false
      pcs.set(pc.id, { id: pc.id, name: pc.name, ...(pc.platform && { platform: pc.platform }), ...(known?.seen && { seen: known.seen }) })
      save()
      return true
    },
    saw(id: string, at: number, exact: boolean) {
      const known = pcs.get(id)
      if (!known || (!exact && known.seen !== undefined && at - known.seen < seenPrecision)) return
      pcs.set(id, { ...known, seen: at })
      save()
    },
    forget(id: string) {
      if (pcs.delete(id)) save()
    },
  }
}

export type KnownPcs = ReturnType<typeof knownPcs>
