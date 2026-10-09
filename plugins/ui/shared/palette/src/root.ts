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
  for (const source of [...sources].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))) {
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
  placeholder: 'Search threads, projects and commands…',
  empty: 'No matching threads, projects or commands.',
  items: query => merged(sources().filter(source => !source.page), query),
})
