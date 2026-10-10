import type { SettingsPage, SettingsSection } from './contract'
import { sig } from '@sand/dom'

const byOrder = (a: { order?: number }, b: { order?: number }) => (a.order ?? 0) - (b.order ?? 0)

const matches = (page: SettingsPage, query: string) => page.id === query || page.label.toLowerCase() === query.toLowerCase()

export const pageStore = () => {
  const pages = sig<SettingsPage[]>([])
  const current = sig<string | undefined>(undefined)
  const sections = sig<SettingsSection[]>([])
  let last: string | undefined

  const pick = (query?: string) => {
    const all = pages.get()
    return (query ? all.find(page => matches(page, query)) : undefined) ?? all.find(page => page.id === last) ?? all[0]
  }

  return {
    pages,
    current,
    sections,
    pick,
    show(id: string | undefined) {
      if (id) last = id
      current.set(id)
    },
    add(page: SettingsPage) {
      pages.update(all => [...all.filter(other => other.id !== page.id), page].sort(byOrder))
      return () => pages.update(all => all.filter(other => other !== page))
    },
    addSection(section: SettingsSection) {
      const same = (other: SettingsSection) => other.page === section.page && other.id === section.id
      sections.update(all => [...all.filter(other => !same(other)), section].sort(byOrder))
      return () => sections.update(all => all.filter(other => other !== section))
    },
  }
}

export type PageStore = ReturnType<typeof pageStore>
