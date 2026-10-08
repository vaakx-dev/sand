import type { SettingsPage } from '@sand/protocol'
import { sig } from '@sand/dom'

const byOrder = (a: SettingsPage, b: SettingsPage) => (a.order ?? 0) - (b.order ?? 0)

const matches = (page: SettingsPage, query: string) => page.id === query || page.label.toLowerCase() === query.toLowerCase()

export const pageStore = () => {
  const pages = sig<SettingsPage[]>([])
  const current = sig<string | undefined>(undefined)
  let last: string | undefined

  const pick = (query?: string) => {
    const all = pages.get()
    return (query ? all.find(page => matches(page, query)) : undefined) ?? all.find(page => page.id === last) ?? all[0]
  }

  return {
    pages,
    current,
    pick,
    show(id: string | undefined) {
      if (id) last = id
      current.set(id)
    },
    add(page: SettingsPage) {
      pages.update(all => [...all.filter(other => other.id !== page.id), page].sort(byOrder))
      return () => pages.update(all => all.filter(other => other !== page))
    },
  }
}

export type PageStore = ReturnType<typeof pageStore>
