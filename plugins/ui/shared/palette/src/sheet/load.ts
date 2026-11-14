import type { PaletteItem, PalettePage } from '../contract'
import { ranked, type Used } from './rank'

const LIMIT = 100

export const loadItems = async (page: PalettePage, query: string, used: Used) => {
  const items = (await page.items?.(query)) ?? []
  if (page.field || page.filter === false || !query.trim()) return items.slice(0, LIMIT)
  return ranked(items, query, used).slice(0, LIMIT)
}

export type Entry = { key: string; group: string } | { key: string; item: PaletteItem; position: number }

const rowKey = (item: PaletteItem) => [item.group, item.id, item.label, item.detail, item.excerpt?.text, item.excerpt?.marks.join(' '), item.meta, item.disabled, item.actions?.length].join('\u0000')

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
