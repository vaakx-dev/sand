import type { Feature, Features } from '@sand/config/contract'
import type { Runtimes } from '@sand/host-runtimes/contract'
import { serial } from '@sand/util'
import type { AddonListing, AddonStamp } from '@sand/util/release'
import type { Addon, AddonSource, FeatureChoice } from '../contract'
import { catalogCache, type Shelf } from './catalog'
import { installedStamps, installFolder, removeAddonFolder } from './folder'
import { pictureCache } from './picture'
import { parseSource, sourceOf, type Source, type sourceStore } from './sources'

interface AddonsOptions {
  root: string
  version: string
  features: Features
  runtimes: Pick<Runtimes, 'swap'>
  main: Source
  saved: ReturnType<typeof sourceStore>
}

interface Offer {
  listing: AddonListing
  source: Source
  url: string
}

interface Known {
  features: Feature[]
  stamps: Map<string, AddonStamp>
  shelves: Shelf[]
  offers: Map<string, Offer>
}

type Freshness = 'recent' | 'fresh'

const byLabel = (a: Addon, b: Addon) => a.label.localeCompare(b.label)

const listed = (ids: string[]) => ids.join(', ')

const offersIn = (shelves: Shelf[]) => {
  const offers = new Map<string, Offer>()
  for (const { source, url, catalog } of shelves)
    for (const listing of catalog?.addons ?? []) if (url && !offers.has(listing.id)) offers.set(listing.id, { listing, source, url })
  return offers
}

const sourceState = ({ source: { id, label, removable }, error }: Shelf): AddonSource => ({ id, label, removable, ...(error && { error }) })

const createAddons = ({ root, version, features, runtimes, main, saved }: AddonsOptions) => {
  const queue = serial()
  const cache = catalogCache()
  const pictures = pictureCache()
  const compatible = (listing: AddonListing) => Bun.semver.satisfies(version, listing.sand)

  const sources = async () => [main, ...(await saved.read()).map(sourceOf)]

  const known = async (freshness: Freshness): Promise<Known> => {
    const shelves = await Promise.all((await sources()).map(source => cache[freshness](source)))
    return { features: features.list(), stamps: await installedStamps(root), shelves, offers: offersIn(shelves) }
  }

  const offerFrom = ({ shelves, offers }: Known, id: string, from: string) => {
    const shelf = shelves.find(found => found.source.id === from)
    const listing = shelf?.catalog?.addons.find(found => found.id === id)
    return shelf?.url && listing ? { listing, source: shelf.source, url: shelf.url } : offers.get(id)
  }

  const stateOf = (id: string, state: Known): Addon => {
    const feature = state.features.find(found => found.id === id)
    const stamp = state.stamps.get(id)
    const offer = stamp ? offerFrom(state, id, stamp.source) : state.offers.get(id)
    const listing = offer?.listing
    const about = {
      id,
      label: feature?.label ?? listing?.label ?? id,
      summary: feature?.summary ?? listing?.summary ?? '',
      readme: listing?.readme ?? '',
      pictures: listing?.pictures ?? [],
      ...(listing?.cover && { cover: listing.cover }),
      ...(offer && { source: { id: offer.source.id, label: offer.source.label } }),
    }
    if (stamp) {
      const newer = listing && listing.hash !== stamp.hash && compatible(listing)
      return { ...about, status: 'installed', version: stamp.version, ...(newer && { update: listing.version }) }
    }
    if (feature) return { ...about, status: 'built-in' }
    const fits = !listing || compatible(listing)
    return { ...about, status: 'available', version: listing?.version, ...(!fits && { needsSand: listing.sand }) }
  }

  const choiceOf = (state: Known): FeatureChoice => {
    const ids = new Set([...state.stamps.keys(), ...state.offers.keys(), ...state.features.filter(feature => feature.addon).map(feature => feature.id)])
    return { features: state.features, addons: [...ids].map(id => stateOf(id, state)).toSorted(byLabel), sources: state.shelves.map(sourceState) }
  }

  const choice = async (freshness: Freshness = 'recent') => choiceOf(await known(freshness))

  const reload = async (changes: Record<string, boolean>) => {
    await features.refresh()
    if (Object.keys(changes).length) await features.set(changes)
    await runtimes.swap('plugins')
  }

  const withNeeds = (ids: string[], offers: Map<string, Offer>) => {
    const wanted = new Set<string>()
    const visit = (id: string) => {
      if (wanted.has(id)) return
      wanted.add(id)
      for (const need of offers.get(id)?.listing.needs ?? []) visit(need)
    }
    ids.forEach(visit)
    return [...wanted]
  }

  const fitting = (offers: Offer[]) => {
    const unfit = offers.map(offer => offer.listing).filter(listing => !compatible(listing))
    if (unfit.length) throw new Error(`${listed(unfit.map(listing => listing.label))} needs a newer sand (${listed(unfit.map(listing => listing.sand))}); update sand first`)
    return offers
  }

  const download = ({ listing, source, url }: Offer) => installFolder({ root, listing, catalogUrl: url, source: source.id })

  const install = (ids: string[]) =>
    queue(async () => {
      const state = await known('fresh')
      const wanted = withNeeds(ids, state.offers)
      const here = (id: string) => state.stamps.has(id) || state.features.some(feature => feature.id === id)
      const unknown = wanted.filter(id => !here(id) && !state.offers.has(id))
      if (unknown.length) throw new Error(`No add-on named ${listed(unknown)}`)
      for (const offer of fitting(wanted.filter(id => !here(id)).map(id => state.offers.get(id)!))) await download(offer)
      await reload(Object.fromEntries(wanted.map(id => [id, true])))
      return choice()
    })

  const update = (ids: string[]) =>
    queue(async () => {
      const state = await known('fresh')
      const missing = ids.filter(id => !state.stamps.has(id))
      if (missing.length) throw new Error(`${listed(missing)} isn't a downloaded add-on`)
      const offers = ids.flatMap(id => offerFrom(state, id, state.stamps.get(id)!.source) ?? [])
      const stale = fitting(offers).filter(({ listing }) => listing.hash !== state.stamps.get(listing.id)?.hash)
      for (const offer of stale) await download(offer)
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

  const addSource = (text: string) =>
    queue(async () => {
      const wanted = parseSource(text)
      const source = sourceOf(wanted)
      if ((await sources()).some(known => known.id === source.id || known.label === source.label)) throw new Error(`${source.label} is already a source`)
      const shelf = await cache.fresh(source)
      if (shelf.error) throw new Error(`Couldn't add ${source.label}: ${shelf.error}`)
      await saved.write([...(await saved.read()), wanted])
      return choice()
    })

  const removeSource = (id: string) =>
    queue(async () => {
      if (id === main.id) throw new Error(`${main.label} is sand's own source and stays`)
      const all = await saved.read()
      const kept = all.filter(entry => sourceOf(entry).id !== id)
      if (kept.length === all.length) throw new Error(`No source ${id}`)
      await saved.write(kept)
      cache.forget(id)
      return choice()
    })

  const picture = async (id: string, file: string) => {
    const state = await known('recent')
    const stamp = state.stamps.get(id)
    const offer = stamp ? offerFrom(state, id, stamp.source) : state.offers.get(id)
    if (!offer || ![...offer.listing.pictures, offer.listing.cover].includes(file)) throw new Error(`${id} has no picture ${file}`)
    return pictures(new URL(file, offer.url).href, file)
  }

  const ready = async () => (await choice()).addons.filter(addon => addon.status === 'available' && !addon.needsSand)

  return { choice, ready, picture, install, update, remove, set, addSource, removeSource }
}

export { createAddons }
