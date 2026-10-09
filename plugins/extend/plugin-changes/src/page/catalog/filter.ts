import type { PluginEntry, PluginOrigin } from '@sand/protocol'
import { derive, score, sig, type Choice } from '@sand/dom'
import type { LibrarySource } from '../../library/source'

export type OriginFilter = 'all' | PluginOrigin

export interface AreaGroup {
  area: string
  title: string
  plugins: PluginEntry[]
}

const areas: [string, string][] = [
  ['yours', 'Your plugins'],
  ['core', 'Core'],
  ['agent', 'Agent'],
  ['ui/layout', 'Layout'],
  ['ui/thread', 'Thread'],
  ['ui/shared', 'Shared interface'],
  ['projects', 'Projects'],
  ['pcs', 'PCs'],
  ['extend', 'Extending sand'],
]

const titles = new Map(areas)

const rank = (area: string) => {
  const index = areas.findIndex(([name]) => name === area)
  return index < 0 ? areas.length : index
}

const text = (plugin: PluginEntry) => [plugin.name, plugin.label, plugin.description].filter(Boolean).join(' ')

export const originLabels: Record<PluginOrigin, string> = { builtin: 'Built-in', customised: 'Customised', yours: 'Yours' }

export const pluginFilter = (source: LibrarySource) => {
  const query = sig('')
  const origin = sig<OriginFilter>('all')

  const all = derive(() => source.library.get()?.plugins ?? [])

  const choices = derive((): Choice<OriginFilter>[] => {
    const count = (kind: OriginFilter) => all.get().filter(plugin => kind === 'all' || plugin.origin === kind).length
    const kinds: OriginFilter[] = ['all', 'builtin', 'customised', 'yours']
    return kinds.map(kind => ({ value: kind, label: `${kind === 'all' ? 'All' : originLabels[kind]} ${count(kind)}` }))
  })

  const groups = derive((): AreaGroup[] => {
    const wanted = query.get().trim()
    const kind = origin.get()
    const shown = all.get().filter(plugin => (kind === 'all' || plugin.origin === kind) && (!wanted || score(wanted, text(plugin)) !== undefined))
    const byArea = new Map<string, PluginEntry[]>()
    for (const plugin of shown) byArea.set(plugin.area, [...(byArea.get(plugin.area) ?? []), plugin])
    return [...byArea.entries()]
      .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
      .map(([area, plugins]) => ({ area, title: titles.get(area) ?? area, plugins }))
  })

  return { query, origin, choices, groups, loading: derive(() => source.library.get() === undefined) }
}

export type PluginFilter = ReturnType<typeof pluginFilter>
