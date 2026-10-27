import type { PluginEntry, PluginOrigin } from '@sand/host-plugin-library/contract'
import type { Choice, Kit } from '@sand/ui-kit/contract'
import { score } from '@sand/util'
import { derive, sig } from '@vaakx-dev/vrui'
import type { LibrarySource } from './source'

type OriginFilter = 'all' | PluginOrigin

export interface AreaGroup {
  area: string
  title: string
  plugins: PluginEntry[]
}

const areas: [string, string][] = [
  ['yours', 'Your plugins'],
  ['core', 'Core'],
  ['agent', 'Agent'],
  ['ui/look', 'Look'],
  ['ui/layout', 'Layout'],
  ['ui/chat', 'Chat'],
  ['ui/shared', 'Shared interface'],
  ['project', 'Projects'],
  ['pcs', 'PCs'],
  ['extend', 'Extending sand'],
  ['cli', 'Command line'],
]

const titles = new Map(areas)

const rank = (area: string) => {
  const index = areas.findIndex(([name]) => name === area)
  return index < 0 ? areas.length : index
}

const text = (plugin: PluginEntry) => [plugin.name, plugin.label, plugin.description].filter(Boolean).join(' ')

export const originLabels: Record<PluginOrigin, string> = { builtin: 'Built-in', customised: 'Customised', yours: 'Yours' }

export const pluginFilter = (source: LibrarySource, { countMark }: Kit) => {
  const query = sig('')
  const origin = sig<OriginFilter>('all')

  const all = derive(() => source.plugins.get() ?? [])

  const choices = derive((): Choice<OriginFilter>[] => {
    const count = (kind: OriginFilter) => all.get().filter(plugin => kind === 'all' || plugin.origin === kind).length
    const kinds: OriginFilter[] = ['all', 'builtin', 'customised', 'yours']
    const found = kinds.filter(kind => count(kind) > 0)
    if (found.length <= 2) return []
    return found.map(kind => ({ value: kind, label: kind === 'all' ? 'All' : originLabels[kind], mark: countMark(count(kind)) }))
  })

  const active = derive(() => (choices.get().some(choice => choice.value === origin.get()) ? origin.get() : 'all'))

  const clear = () => {
    query.set('')
    origin.set('all')
  }

  const groups = derive((): AreaGroup[] => {
    const wanted = query.get().trim()
    const kind = active.get()
    const shown = all.get().filter(plugin => (kind === 'all' || plugin.origin === kind) && (!wanted || score(wanted, text(plugin)) !== undefined))
    const byArea = new Map<string, PluginEntry[]>()
    for (const plugin of shown) byArea.set(plugin.area, [...(byArea.get(plugin.area) ?? []), plugin])
    return [...byArea.entries()]
      .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
      .map(([area, plugins]) => ({ area, title: titles.get(area) ?? area, plugins }))
  })

  return { query, origin, active, choices, groups, clear, loading: derive(() => source.plugins.get() === undefined) }
}

export type PluginFilter = ReturnType<typeof pluginFilter>
