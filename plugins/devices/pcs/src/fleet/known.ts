import { type PcIcon, pcIconSchema } from '@sand/devices-contract'
import { isRecord } from '@sand/util'
import { readStored, writeStored } from '../integrations/storage'

export interface KnownPc {
  id: string
  name: string
  platform?: string
  icon?: PcIcon
  detectedIcon?: PcIcon
  seen?: number
}

const knownKey = 'sand.pcs'
const seenPrecision = 30_000

const optionalIcon = (value: unknown) => value === undefined || pcIconSchema.safeParse(value).success

const isKnown = (value: unknown): value is KnownPc =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  typeof value.name === 'string' &&
  (value.platform === undefined || typeof value.platform === 'string') &&
  optionalIcon(value.icon) &&
  optionalIcon(value.detectedIcon) &&
  (value.seen === undefined || typeof value.seen === 'number')

const same = (a: KnownPc | undefined, b: KnownPc) =>
  a?.name === b.name && a.platform === b.platform && a.icon === b.icon && a.detectedIcon === b.detectedIcon

const merged = (known: KnownPc | undefined, pc: KnownPc): KnownPc => {
  const icon = pc.icon ?? known?.icon
  const detectedIcon = pc.detectedIcon ?? known?.detectedIcon
  return {
    id: pc.id,
    name: pc.name,
    ...(pc.platform && { platform: pc.platform }),
    ...(icon && { icon }),
    ...(detectedIcon && { detectedIcon }),
    ...(known?.seen && { seen: known.seen }),
  }
}

export const knownPcs = () => {
  const saved = readStored(knownKey)
  const pcs = new Map((Array.isArray(saved) ? saved.filter(isKnown) : []).map(pc => [pc.id, pc]))

  const save = () => writeStored(knownKey, [...pcs.values()])

  return {
    get: (id: string) => pcs.get(id),
    ids: () => [...pcs.keys()],
    learn(pc: KnownPc) {
      const known = pcs.get(pc.id)
      const next = merged(known, pc)
      if (same(known, next)) return false
      pcs.set(pc.id, next)
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
