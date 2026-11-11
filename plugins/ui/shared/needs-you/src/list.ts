import { sig } from '@vaakx-dev/vrui'
import type { NeedSource, Needs } from './contract'

export const createList = (): Needs => {
  const sources = sig<NeedSource[]>([])
  return {
    source(source) {
      sources.update(all => [...all.filter(other => other.id !== source.id), source])
      return () => sources.update(all => all.filter(other => other !== source))
    },
    list: () =>
      sources
        .get()
        .flatMap(source => source.items())
        .toSorted((a, b) => a.at - b.at || a.id.localeCompare(b.id)),
    open() {},
  }
}
