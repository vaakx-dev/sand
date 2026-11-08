import { byOrder } from '@sand/util'
import type { SettingsGroup, SettingsPage, SettingsSection } from './contract'
import { derive, sig } from '@vaakx-dev/vrui'

export const groups: { id: SettingsGroup; label: string }[] = [
  { id: 'agents', label: 'Agents' },
  { id: 'accounts', label: 'Accounts and devices' },
  { id: 'workspace', label: 'Workspace' },
  { id: 'app', label: 'App' },
]

export const groupOf = (page: SettingsPage) => page.group ?? 'app'

const rank = (page: SettingsPage) => groups.findIndex(group => group.id === groupOf(page))

const byGroup = (a: SettingsPage, b: SettingsPage) => rank(a) - rank(b) || byOrder(a, b)

const matches = (page: SettingsPage, query: string) => page.id === query || page.label.toLowerCase() === query.toLowerCase()

export const pageStore = () => {
  const registered = sig<SettingsPage[]>([])
  const sections = sig<SettingsSection[]>([])
  const pages = derive(() => registered.get().filter(page => page.render || sections.get().some(section => section.page === page.id)))
  let last: string | undefined

  const pick = (query?: string) => {
    const all = pages.get()
    return (query ? all.find(page => matches(page, query)) : undefined) ?? all.find(page => page.id === last) ?? all[0]
  }

  return {
    pages,
    sections,
    pick,
    remember(id: string) {
      last = id
    },
    add(page: SettingsPage) {
      registered.update(all => [...all.filter(other => other.id !== page.id), page].sort(byGroup))
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
