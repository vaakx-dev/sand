import { type wire, wireHello } from '@sand/devices-contract'
import { errorMessage } from '@sand/util'
import { type Sig, sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { addonsInstall, addonsPicture, addonsRemove, addonsSourceAdd, addonsSourceRemove, addonsUpdate, type FeatureChoice, featuresList, featuresSet } from '../contract'

const DOWNLOAD = { timeout: 10 * 60_000 }

export const featureStore = (ctx: Context<{ wire: typeof wire }>) => {
  const choice = sig<FeatureChoice | undefined>(undefined)
  const applying = sig<Record<string, boolean> | undefined>(undefined)
  const error = sig('')

  const call = async (work: () => Promise<FeatureChoice>) => {
    error.set('')
    try {
      choice.set(await work())
      return true
    } catch (failure) {
      error.set(errorMessage(failure))
      return false
    }
  }

  const load = () => call(() => ctx.wire.call(featuresList, {}))
  ctx.on(wireHello, () => void load())
  if (ctx.wire.ready()) void load()

  const busy = async (changes: Record<string, boolean>, work: () => Promise<FeatureChoice>) => {
    applying.set(changes)
    const done = await call(work)
    applying.set(undefined)
    return done
  }

  const apply = (changes: Record<string, boolean>) => busy(changes, () => ctx.wire.call(featuresSet, { changes }))
  const install = (id: string) => busy({ [id]: true }, () => ctx.wire.call(addonsInstall, { ids: [id] }, undefined, DOWNLOAD))
  const update = (id: string) => busy({ [id]: true }, () => ctx.wire.call(addonsUpdate, { ids: [id] }, undefined, DOWNLOAD))
  const remove = (id: string) => busy({ [id]: false }, () => ctx.wire.call(addonsRemove, { ids: [id] }, undefined, DOWNLOAD))
  const addSource = (source: string) => busy({ [source]: true }, () => ctx.wire.call(addonsSourceAdd, { source }))
  const removeSource = (id: string) => busy({ [id]: false }, () => ctx.wire.call(addonsSourceRemove, { id }))
  const query = sig('')

  const feature = (id: string) => choice.get()?.features.find(found => found.id === id)

  const addon = (id: string) => choice.get()?.addons.find(found => found.id === id)

  const pictures = new Map<string, Sig<string | undefined>>()
  const picture = (id: string, file: string) => {
    const key = `${id}/${file}`
    const known = pictures.get(key)
    if (known) return known
    const shown = sig<string | undefined>(undefined)
    pictures.set(key, shown)
    ctx.wire.call(addonsPicture, { id, file }).then(
      url => shown.set(url),
      () => pictures.delete(key),
    )
    return shown
  }

  return { choice, applying, error, query, feature, addon, picture, apply, install, update, remove, addSource, removeSource }
}

export type FeatureStore = ReturnType<typeof featureStore>
