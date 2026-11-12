import { type wire, wireHello } from '@sand/devices-contract'
import { errorMessage } from '@sand/util'
import { sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { addonsInstall, addonsRemove, addonsUpdate, type FeatureChoice, featuresList, featuresSet } from '../contract'

const DOWNLOAD = { timeout: 10 * 60_000 }

export const featureStore = (ctx: Context<{ wire: typeof wire }>) => {
  const choice = sig<FeatureChoice | undefined>(undefined)
  const applying = sig<Record<string, boolean> | undefined>(undefined)
  const error = sig('')

  const call = async (work: () => Promise<FeatureChoice>) => {
    error.set('')
    try {
      choice.set(await work())
    } catch (failure) {
      error.set(errorMessage(failure))
    }
  }

  const load = () => call(() => ctx.wire.call(featuresList, {}))
  ctx.on(wireHello, () => void load())
  if (ctx.wire.ready()) void load()

  const busy = async (changes: Record<string, boolean>, work: () => Promise<FeatureChoice>) => {
    applying.set(changes)
    await call(work)
    applying.set(undefined)
  }

  const apply = (changes: Record<string, boolean>) => busy(changes, () => ctx.wire.call(featuresSet, { changes }))
  const install = (id: string) => busy({ [id]: true }, () => ctx.wire.call(addonsInstall, { ids: [id] }, undefined, DOWNLOAD))
  const update = (id: string) => busy({ [id]: true }, () => ctx.wire.call(addonsUpdate, { ids: [id] }, undefined, DOWNLOAD))
  const remove = (id: string) => busy({ [id]: false }, () => ctx.wire.call(addonsRemove, { ids: [id] }, undefined, DOWNLOAD))

  const feature = (id: string) => choice.get()?.features.find(found => found.id === id)

  return { choice, applying, error, feature, apply, install, update, remove }
}

export type FeatureStore = ReturnType<typeof featureStore>
