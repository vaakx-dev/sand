import { byOrder } from '@sand/util'
import type { PlusEntry } from '../contract'
import { sig } from '@vaakx-dev/vrui'

interface Ranked {
  entry: PlusEntry
  order: number
}

export const createPlus = () => {
  const ranked = sig<Ranked[]>([])
  const entries = ranked.map(all => all.map(({ entry }) => entry))

  const add = (entry: PlusEntry, order = 0) => {
    const added = { entry, order }
    ranked.update(all => [...all, added].sort(byOrder))
    return () => {
      entry.open.set(false)
      ranked.update(all => all.filter(other => other !== added))
    }
  }

  return { entries, add }
}

export type Plus = ReturnType<typeof createPlus>
