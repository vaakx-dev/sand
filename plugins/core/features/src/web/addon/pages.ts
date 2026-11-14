import type { Settings } from '@sand/settings/contract'
import { effect, untrack } from '@vaakx-dev/vrui'
import type { Dispose } from 'drydock'
import { type Addon, addonPageId } from '../../contract'
import { extrasOf, isExtra } from './extras'
import { addonPage, type PageParts } from './page'

const LIST = 'features'

const described = (addon: Addon) => Boolean(addon.readme || addon.pictures.length)

const addonPages = (host: Settings, parts: PageParts) => {
  const shown = new Map<string, { label: string; dispose: Dispose }>()
  const add = ({ id, label }: Addon) => {
    const before = shown.get(id)
    if (before?.label === label) return
    const dispose = host.page({ id: addonPageId(id), label, parent: LIST, group: 'app', render: () => addonPage(parts, id) })
    shown.set(id, { label, dispose })
    void before?.dispose()
  }
  const drop = (id: string) => {
    if (host.current() === addonPageId(id)) host.open(LIST)
    void shown.get(id)?.dispose()
    shown.delete(id)
  }
  const sync = (addons: Addon[]) => {
    addons.forEach(add)
    const kept = new Set(addons.map(addon => addon.id))
    for (const id of [...shown.keys()]) if (!kept.has(id)) drop(id)
  }
  const stop = effect(() => {
    const choice = parts.store.choice.get()
    const addons = choice ? choice.addons.filter(addon => !isExtra(choice, addon) && (described(addon) || extrasOf(choice, addon.id).length > 0)) : []
    untrack(() => sync(addons))
  })
  return {
    open: (id: string) => host.open(addonPageId(id)),
    has: (id: string) => shown.has(id),
    dispose() {
      stop()
      for (const { dispose } of shown.values()) void dispose()
      shown.clear()
    },
  }
}

export { addonPages }
