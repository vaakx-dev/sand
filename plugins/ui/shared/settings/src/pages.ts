import { byOrder } from '@sand/util'
import type { SettingsPage, SettingsSection } from './contract'
import { derive, sig } from '@vaakx-dev/vrui'

const matches = (page: SettingsPage, query: string) => page.id === query || page.label.toLowerCase() === query.toLowerCase()

export const pageStore = () => {
  const registered = sig<SettingsPage[]>([])
  const current = sig<string | undefined>(undefined)
  const sections = sig<SettingsSection[]>([])
  const pages = derive(() => registered.get().filter(page => page.render || sections.get().some(section => section.page === page.id)))
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
      registered.update(all => [...all.filter(other => other.id !== page.id), page].sort(byOrder))
      return () => registered.update(all => all.filter(other => other !== page))
    },
    addSection(section: SettingsSection) {
      const same = (other: SettingsSection) => other.page === section.page && other.id === section.id
      sections.update(all => [...all.filter(other => !same(other)), section].sort(byOrder))
      return () => sections.update(all => all.filter(other => other !== section))
    },
  }
}

export type PageStore = ReturnType<typeof pageStore>
