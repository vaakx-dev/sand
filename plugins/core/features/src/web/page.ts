import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild, media, show } from '@vaakx-dev/vrui'
import type { Addon, FeatureChoice } from '../contract'
import { addonCard } from './addon/card'
import { addonControls, addonLine } from './addon/controls'
import { detail, row, tree, working } from './rows'
import type { FeatureStore } from './store'

interface AddonLinks {
  open(id: string): void
  has(id: string): boolean
  core(): void
}

const installedRows = (kit: Kit, store: FeatureStore, choice: FeatureChoice, links: AddonLinks, addon: Addon) => {
  const feature = choice.features.find(found => found.id === addon.id)
  const head = kit.settingsRow(
    { title: addon.label, detail: detail(addon.summary, addonLine(choice, addon, feature)), ...(links.has(addon.id) && { onOpen: () => links.open(addon.id) }) },
    working(kit, store, addon.id),
    ...addonControls(kit, store, choice, addon, feature),
  )
  const children = feature ? tree(choice.features, feature).slice(1).map(item => row(kit, store, choice, item)) : []
  return [head, ...children]
}

const catalogNote = ({ catalogError, addons }: FeatureChoice) => {
  if (!catalogError) return undefined
  return addons.length ? "Can't reach the add-on catalog, so only installed add-ons show. They keep working." : "Can't reach the add-on catalog. Try again when you're online."
}

const cards = (kit: Kit, store: FeatureStore, links: AddonLinks, available: Addon[]) => {
  const wide = media('(min-width: 640px)')
  return div({ class: () => ['grid gap-3', wide.get() ? 'grid-cols-2' : 'grid-cols-1'] }, ...available.map(addon => addonCard(kit, store, addon, links.open)))
}

const featuresPage = (kit: Kit, store: FeatureStore, links: AddonLinks) => {
  const { errorText, loadingState, settingsSection } = kit
  const state = derive(() => JSON.stringify(store.choice.get() ?? null))
  return div(
    { class: 'flex flex-col gap-6' },
    show(
      () => Boolean(store.error.get()),
      () => errorText(() => store.error.get()),
    ),
    dynamicChild(state, () => {
      const choice = store.choice.get()
      if (!choice) return loadingState()
      const { addons } = choice
      const installed = addons.filter(addon => addon.status !== 'available')
      const available = addons.filter(addon => addon.status === 'available')
      const note = catalogNote(choice)
      return div(
        { class: 'contents' },
        installed.length ? settingsSection({ title: 'Installed' }, ...installed.flatMap(addon => installedRows(kit, store, choice, links, addon))) : null,
        available.length || note ? settingsSection({ title: 'Available', note }, available.length ? cards(kit, store, links, available) : null) : null,
        settingsSection({}, kit.settingsRow({ title: 'Core features', detail: 'Threads, bots, phones and the parts of sand they share', onOpen: links.core })),
      )
    }),
  )
}

export { featuresPage, type AddonLinks }
