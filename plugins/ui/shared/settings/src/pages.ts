import { byOrder } from '@sand/util'
import type { SettingsGroup, SettingsItem, SettingsPage, SettingsSection } from './contract'
import { derive, sig } from '@vaakx-dev/vrui'

export interface Group {
  id: SettingsGroup
  label?: string
}

export interface Found {
  key: string
  label: string
  page: SettingsPage
  place?: string
  item?: string
}

export interface Target {
  page: string
  item: string
}

export const groups: Group[] = [
  { id: 'everyday' },
  { id: 'agents', label: 'Agents' },
  { id: 'accounts', label: 'Accounts and devices' },
  { id: 'workspace', label: 'Workspace' },
  { id: 'app', label: 'App' },
]

export const groupOf = (page: SettingsPage) => page.group ?? 'app'

const rank = (page: SettingsPage) => groups.findIndex(group => group.id === groupOf(page))

const byGroup = (a: SettingsPage, b: SettingsPage) => rank(a) - rank(b) || byOrder(a, b)

const matches = (page: SettingsPage, query: string) => page.id === query || page.label.toLowerCase() === query.toLowerCase()

const words = (...texts: string[]) => texts.join(' ').toLowerCase()

const hits = (text: string, query: string) => query.split(/\s+/).every(word => text.includes(word))

export const pageStore = () => {
  const registered = sig<SettingsPage[]>([])
  const sections = sig<SettingsSection[]>([])
  const target = sig<Target | undefined>(undefined)
  const pages = derive(() => registered.get().filter(page => page.render || sections.get().some(section => section.page === page.id)))
  let last: string | undefined

  const pick = (query?: string) => {
    const all = pages.get()
    return (query ? all.find(page => matches(page, query)) : undefined) ?? all.find(page => page.id === last) ?? all[0]
  }

  const itemsOf = (page: SettingsPage) => [...(page.items ?? []), ...sections.get().flatMap(section => (section.page === page.id ? (section.items ?? []) : []))]

  const pageFound = (page: SettingsPage, byId: Map<string, SettingsPage>): Found & { text: string } => ({
    key: page.id,
    label: page.label,
    page,
    ...(page.parent && { place: byId.get(page.parent)?.label }),
    text: words(page.label),
  })

  const itemFound = (page: SettingsPage, item: SettingsItem): Found & { text: string } => ({
    key: `${page.id}/${item.id}`,
    label: item.label,
    page,
    place: page.label,
    item: item.id,
    text: words(item.label, ...(item.keywords ?? [])),
  })

  const index = derive(() => {
    const all = pages.get()
    const byId = new Map(all.map(page => [page.id, page]))
    return all.flatMap(page => [pageFound(page, byId), ...itemsOf(page).map(item => itemFound(page, item))])
  })

  const search = (query: string): Found[] => {
    const text = query.trim().toLowerCase()
    const found = index.get().filter(entry => hits(entry.text, text))
    const leads = (entry: Found) => (entry.label.toLowerCase().startsWith(text) ? 0 : 1)
    return found.sort((a, b) => leads(a) - leads(b))
  }

  return {
    pages,
    sections,
    target,
    pick,
    search,
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
