import type { Markdown } from '@sand/markdown/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild, img, p, show } from '@vaakx-dev/vrui'
import type { Addon } from '../../contract'
import { working } from '../rows'
import type { FeatureStore } from '../store'
import { addonControls, addonLine } from './controls'

interface PageParts {
  kit: Kit
  store: FeatureStore
  markdown: () => Markdown | undefined
}

const picture = (store: FeatureStore, addon: Addon) => (file: string, alt: string) => {
  if (!addon.pictures.includes(file)) return undefined
  const url = store.picture(addon.id, file)
  return div(
    { class: 'my-2 overflow-hidden rounded-md ring-1 ring-neutral-800' },
    show(() => Boolean(url.get()), () => img({ src: () => url.get() ?? '', alt, class: 'block w-full' })),
  )
}

const readme = ({ store, markdown }: PageParts, addon: Addon) => {
  const render = markdown()
  if (!addon.readme) return null
  if (!render) return div({ class: 'whitespace-pre-wrap text-sm text-neutral-200' }, addon.readme)
  return div({ class: 'flex min-w-0 flex-col' }, ...render.nodes(addon.readme, { image: picture(store, addon), size: 'reading' }))
}

const head = ({ kit, store }: PageParts, addon: Addon) => {
  const choice = store.choice.get()!
  const feature = choice.features.find(found => found.id === addon.id)
  const line = addonLine(choice, addon, feature)
  return div(
    { class: 'flex flex-wrap items-center gap-x-6 gap-y-3' },
    div(
      { class: 'flex min-w-0 flex-1 flex-col gap-1 text-sm' },
      p({ class: 'text-neutral-400' }, addon.summary),
      addon.source ? p({ class: 'text-neutral-500' }, `From ${addon.source.label}`) : null,
      line ? p({ class: 'text-neutral-500' }, line) : null,
    ),
    div({ class: 'flex shrink-0 items-center gap-2' }, working(kit, store, addon.id), ...addonControls(kit, store, choice, addon, feature)),
  )
}

const addonPage = (parts: PageParts, id: string) => {
  const state = derive(() => JSON.stringify([parts.store.addon(id), parts.store.choice.get()?.features]))
  return div(
    { class: 'flex flex-col gap-5' },
    dynamicChild(state, () => {
      const addon = parts.store.addon(id)
      if (!addon) return parts.kit.loadingState()
      return div({ class: 'contents' }, head(parts, addon), readme(parts, addon))
    }),
  )
}

export { addonPage, type PageParts }
