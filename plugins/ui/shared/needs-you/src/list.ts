import { sig } from '@vaakx-dev/vrui'
import type { NeedSource, Needs } from './contract'

export const createList = (): Needs => {
  const sources = sig<NeedSource[]>([])
  return {
    source(source) {
      sources.update(all => [...all.filter(other => other.id !== source.id), source])
      return () => sources.update(all => all.filter(other => other !== source))
    },
    list: () => {
      const found = sources.get().map(source => source.items())
      const items = found.flatMap(listed => listed ?? []).toSorted((a, b) => a.at - b.at || a.id.localeCompare(b.id))
      return items.length || found.every(listed => listed !== undefined) ? items : undefined
    },
    open() {},
  }
}
