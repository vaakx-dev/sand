import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild, media, show } from '@vaakx-dev/vrui'
import type { Addon, FeatureChoice } from '../contract'
import { addonCard } from './addon/card'
import { addonControls, addonLine } from './addon/controls'
import { extrasLine, hostsOf, isExtra } from './addon/extras'
import { detail, row, tree, working } from './rows'
import { searchAddons } from './search'
import { sourcesSection } from './sources'
import type { FeatureStore } from './store'

interface AddonLinks {
  open(id: string): void
  has(id: string): boolean
  core(): void
}

interface Shown {
  kit: Kit
  store: FeatureStore
  links: AddonLinks
  choice: FeatureChoice
}

const installedRows = ({ kit, store, links, choice }: Shown, addon: Addon) => {
  const feature = choice.features.find(found => found.id === addon.id)
  const line = [addonLine(choice, addon, feature), extrasLine(choice, addon.id)].filter(Boolean).join(' · ')
  const head = kit.settingsRow(
    { title: addon.label, detail: detail(addon.summary, line), ...(links.has(addon.id) && { onOpen: () => links.open(addon.id) }) },
    working(kit, store, addon.id),
    ...addonControls(kit, store, choice, addon, feature),
  )
  const own = choice.features.filter(found => !choice.addons.some(other => other.id === found.id && isExtra(choice, other)))
  const children = feature ? tree(own, feature).slice(1).map(item => row(kit, store, choice, item)) : []
  return [head, ...children]
}

const unreachable = ({ sources, addons }: FeatureChoice) => {
  const failed = sources.filter(source => source.error).map(source => source.label)
  if (!failed.length) return undefined
  const kept = addons.some(addon => addon.status === 'installed') ? ' Installed add-ons keep working.' : ''
  return `Can't reach ${failed.join(' and ')} right now.${kept}`
}

const cards = ({ kit, store, links }: Shown, available: Addon[]) => {
  const wide = media('(min-width: 640px)')
  return div({ class: () => ['grid gap-3', wide.get() ? 'grid-cols-2' : 'grid-cols-1'] }, ...available.map(addon => addonCard(kit, store, addon, links.open)))
}

const addonSections = (shown: Shown, found: Addon[], note: string | undefined) => {
  const { settingsSection } = shown.kit
  const addons = hostsOf(shown.choice, found)
  const installed = addons.filter(addon => addon.status !== 'available')
  const available = addons.filter(addon => addon.status === 'available')
  return [
    installed.length ? settingsSection({ title: 'Installed' }, ...installed.flatMap(addon => installedRows(shown, addon))) : null,
    available.length || note ? settingsSection({ title: 'Available', note }, available.length ? cards(shown, available) : null) : null,
  ]
}

const searchResults = (shown: Shown, query: string) => {
  const found = searchAddons(shown.choice.addons, query)
  if (!found.length) return [shown.kit.emptyState({ text: `No add-ons match “${query.trim()}”.` })]
  return addonSections(shown, found, undefined)
}

const everything = (shown: Shown) => {
  const { kit, store, links, choice } = shown
  return [
    ...addonSections(shown, choice.addons, unreachable(choice)),
    sourcesSection(kit, store, choice.sources),
    kit.settingsSection({}, kit.settingsRow({ title: 'Core features', detail: 'Threads, bots, phones and the parts of sand they share', onOpen: links.core })),
  ]
}

const featuresPage = (kit: Kit, store: FeatureStore, links: AddonLinks) => {
  const state = derive(() => JSON.stringify([store.choice.get() ?? null, store.query.get().trim()]))
  return div(
    { class: 'flex flex-col gap-6' },
    div({ class: 'flex' }, kit.searchField({ placeholder: 'Search add-ons', 'aria-label': 'Search add-ons', bindValue: store.query })),
    show(
      () => Boolean(store.error.get()),
      () => kit.errorText(() => store.error.get()),
    ),
    dynamicChild(state, () => {
      const choice = store.choice.get()
      if (!choice) return kit.loadingState()
      const shown = { kit, store, links, choice }
      const query = store.query.get()
      return div({ class: 'contents' }, ...(query.trim() ? searchResults(shown, query) : everything(shown)))
    }),
  )
}

export { featuresPage, type AddonLinks }
