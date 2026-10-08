import type { PaletteItem, PalettePage } from '@sand/protocol'

const limit = 100
const perGroup = 30

const rank = (item: PaletteItem, query: string, words: string[]) => {
  const label = item.label.toLowerCase()
  if (label.startsWith(query)) return 0
  if (label.includes(query)) return 1
  if (words.every(word => label.includes(word))) return 2
  const text = `${label} ${item.detail ?? ''} ${item.search ?? ''}`.toLowerCase()
  return words.every(word => text.includes(word)) ? 3 : undefined
}

const ranked = (items: PaletteItem[], typed: string) => {
  const query = typed.trim().toLowerCase()
  const words = query.split(/\s+/)
  const groups = new Map<string, { item: PaletteItem; score: number; index: number }[]>()
  items.forEach((item, index) => {
    const score = rank(item, query, words)
    if (score === undefined) return
    const group = item.group ?? ''
    groups.set(group, [...(groups.get(group) ?? []), { item, score, index }])
  })
  return [...groups.values()].flatMap(found =>
    found
      .sort((a, b) => a.score - b.score || a.index - b.index)
      .slice(0, perGroup)
      .map(entry => entry.item),
  )
}

export const loadItems = async (page: PalettePage, query: string) => {
  const items = (await page.items?.(query)) ?? []
  if (page.field || page.filter === false || !query.trim()) return items.slice(0, limit)
  return ranked(items, query).slice(0, limit)
}

export type Entry = { key: string; group: string } | { key: string; item: PaletteItem; position: number }

const rowKey = (item: PaletteItem) => [item.group, item.id, item.label, item.detail, item.meta, item.busy, item.disabled, item.actions?.length].join('\u0000')

export const entries = (items: PaletteItem[]) => {
  const shown: Entry[] = []
  let group: string | undefined
  items.forEach((item, position) => {
    if (item.group && item.group !== group) shown.push({ key: `group:${item.group}`, group: item.group })
    group = item.group
    shown.push({ key: rowKey(item), item, position })
  })
  return shown
}
