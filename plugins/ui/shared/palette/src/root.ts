import { byOrder } from '@sand/util'
import type { PaletteItem, PalettePage, PaletteSource } from './contract'

const gather = (source: PaletteSource, query: string) => {
  try {
    return source.items(query)
  } catch (error) {
    console.error(`[palette] ${source.id}`, error)
    return []
  }
}

export const merged = (sources: PaletteSource[], query: string) => {
  const groups = new Map<string, PaletteItem[]>()
  const seen = new Set<string>()
  for (const source of sources.toSorted(byOrder)) {
    for (const item of gather(source, query)) {
      if (seen.has(item.id)) continue
      seen.add(item.id)
      const group = item.group ?? ''
      groups.set(group, [...(groups.get(group) ?? []), item])
    }
  }
  return [...groups.values()].flat()
}

export const rootPage = (sources: () => PaletteSource[]): PalettePage => ({
  id: 'root',
  title: 'Search',
  placeholder: 'Search',
  empty: query => (query.trim() ? 'Nothing matches.' : 'Type to search'),
  items: query => merged(sources().filter(source => !source.page), query),
})
