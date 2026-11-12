import type { Feature, Features } from '@sand/config/contract'
import type { Runtimes } from '@sand/host-runtimes/contract'
import { errorMessage, serial } from '@sand/util'
import type { AddonCatalog, AddonListing, AddonStamp } from '@sand/util/release'
import type { Addon, FeatureChoice } from '../contract'
import type { catalogSource } from './catalog'
import { installedStamps, installFolder, removeAddonFolder } from './folder'

interface AddonsOptions {
  root: string
  version: string
  features: Features
  runtimes: Pick<Runtimes, 'swap'>
  catalog: ReturnType<typeof catalogSource>
}

interface Known {
  features: Feature[]
  stamps: Map<string, AddonStamp>
  listings: Map<string, AddonListing>
}

const byLabel = (a: Addon, b: Addon) => a.label.localeCompare(b.label)

const listed = (ids: string[]) => ids.join(', ')

const createAddons = ({ root, version, features, runtimes, catalog }: AddonsOptions) => {
  const queue = serial()
  const compatible = (listing: AddonListing) => Bun.semver.satisfies(version, listing.sand)

  const stateOf = (id: string, { features: list, stamps, listings }: Known): Addon => {
    const feature = list.find(found => found.id === id)
    const listing = listings.get(id)
    const stamp = stamps.get(id)
    const label = feature?.label ?? listing?.label ?? id
    const summary = feature?.summary ?? listing?.summary ?? ''
    if (stamp) {
      const newer = listing && listing.hash !== stamp.hash && compatible(listing)
      return { id, label, summary, status: 'installed', version: stamp.version, ...(newer && { update: listing.version }) }
    }
    if (feature) return { id, label, summary, status: 'built-in' }
    const fits = !listing || compatible(listing)
    return { id, label, summary, status: 'available', version: listing?.version, ...(!fits && { needsSand: listing.sand }) }
  }

  const known = async (found?: AddonCatalog): Promise<Known> => ({
    features: features.list(),
    stamps: await installedStamps(root),
    listings: new Map((found?.addons ?? []).map(listing => [listing.id, listing])),
  })

  const choice = async (): Promise<FeatureChoice> => {
    const read = await catalog.recent().then(
      ({ catalog: found }) => ({ found }),
      (error: unknown) => ({ found: undefined, catalogError: errorMessage(error) }),
    )
    const state = await known(read.found)
    const ids = new Set([...state.stamps.keys(), ...state.listings.keys(), ...state.features.filter(feature => feature.addon).map(feature => feature.id)])
    const addons = [...ids].map(id => stateOf(id, state)).toSorted(byLabel)
    return { features: state.features, addons, ...('catalogError' in read && { catalogError: read.catalogError }) }
  }

  const reload = async (changes: Record<string, boolean>) => {
    await features.refresh()
    if (Object.keys(changes).length) await features.set(changes)
    await runtimes.swap('plugins')
  }

  const withNeeds = (ids: string[], listings: Map<string, AddonListing>) => {
    const wanted = new Set<string>()
    const visit = (id: string) => {
      if (wanted.has(id)) return
      wanted.add(id)
      for (const need of listings.get(id)?.needs ?? []) visit(need)
    }
    ids.forEach(visit)
    return [...wanted]
  }

  const downloads = (ids: string[], state: Known) => {
    const unknown = ids.filter(id => !state.listings.has(id) && !state.features.some(feature => feature.id === id))
    if (unknown.length) throw new Error(`No add-on named ${listed(unknown)}`)
    const listings = ids.flatMap(id => state.listings.get(id) ?? [])
    const unfit = listings.filter(listing => !compatible(listing))
    if (unfit.length) throw new Error(`${listed(unfit.map(listing => listing.label))} needs a newer sand (${listed(unfit.map(listing => listing.sand))}); update sand first`)
    return listings
  }

  const install = (ids: string[]) =>
    queue(async () => {
      const { url, catalog: found } = await catalog.fresh()
      const state = await known(found)
      const wanted = withNeeds(ids, state.listings)
      const missing = wanted.filter(id => !state.stamps.has(id) && !state.features.some(feature => feature.id === id))
      for (const listing of downloads(missing, state)) await installFolder(root, listing, url)
      await reload(Object.fromEntries(wanted.map(id => [id, true])))
      return choice()
    })

  const update = (ids: string[]) =>
    queue(async () => {
      const { url, catalog: found } = await catalog.fresh()
      const state = await known(found)
      const missing = ids.filter(id => !state.stamps.has(id))
      if (missing.length) throw new Error(`${listed(missing)} isn't a downloaded add-on`)
      const stale = downloads(ids, state).filter(listing => listing.hash !== state.stamps.get(listing.id)?.hash)
      for (const listing of stale) await installFolder(root, listing, url)
      if (stale.length) await reload({})
      return choice()
    })

  const remove = (ids: string[]) =>
    queue(async () => {
      const stamps = await installedStamps(root)
      const missing = ids.filter(id => !stamps.has(id))
      if (missing.length) throw new Error(`${listed(missing)} isn't a downloaded add-on, so there is nothing to remove`)
      await features.set(Object.fromEntries(ids.map(id => [id, false])))
      for (const id of ids) await removeAddonFolder(root, id)
      await reload({})
      return choice()
    })

  const set = (changes: Record<string, boolean>) =>
    queue(async () => {
      const ids = new Set(features.list().map(feature => feature.id))
      const unknown = Object.keys(changes).filter(id => !ids.has(id))
      if (unknown.length) throw new Error(`No such feature: ${listed(unknown)}`)
      await features.set(changes)
      await runtimes.swap('plugins')
      return choice()
    })

  const ready = async () => (await choice()).addons.filter(addon => addon.status === 'available' && !addon.needsSand)

  return { choice, ready, install, update, remove, set }
}

export { createAddons }
